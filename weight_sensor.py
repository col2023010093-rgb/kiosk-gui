"""
Local API for the kiosk's temperature, heart-rate/SpO2 and weight sensors,
serving readings to the kiosk web app over HTTP.

Height is NOT served here. It lives in height_sensor_server.py (port 5002),
so only one process ever talks to the VL53L1X distance sensor.

Hardware:
  MLX90614 IR temperature sensor, wired over I2C, default address 0x5A.
  MAX30102 pulse oximetry sensor, wired over I2C, default address 0x57.
  Make sure I2C is enabled: `sudo raspi-config` -> Interface Options -> I2C.
  Check both are detected: `i2cdetect -y 1` should show 5a and 57.
  HX711 + 4 x 50 kg load cells (weight): VCC -> 3.3V (NOT 5V), GND -> GND,
  DT -> GPIO 5, SCK -> GPIO 6. Needs: pip install RPi.GPIO
  (Raspberry Pi 5: pip install rpi-lgpio instead). No other file is needed.

Weight calibration (saved to weight_calibration.json), two steps:
  1. Platform EMPTY:
       curl -X POST http://localhost:5000/api/calibration/weight/tare
  2. Put a known weight on the platform (e.g. 20 kg), then:
       curl -X POST http://localhost:5000/api/calibration/weight/scale \
            -H "Content-Type: application/json" -d '{"knownKg": 20}'
  Re-zero later with step 1 only (platform empty).

Driver:
  MLX90614 uses the `mlx90614` PyPI package directly.
  MAX30102 uses the community driver from doug-burrell/max30102. Download
  these THREE files from https://github.com/doug-burrell/max30102 and place
  them in the same folder as this script:
    - max30102.py
    - hrcalc.py
    - heartrate_monitor.py

Install:
  pip install flask flask-cors smbus2 mlx90614 numpy

Run:
  python3 sensor_server.py
  -> http://<pi-ip>:5000/api/temperature      (~10 s)
  -> http://<pi-ip>:5000/api/heart-rate-spo2  (~12 s)
  -> http://<pi-ip>:5000/api/weight           (up to ~15 s, waits for a steady reading)

TEMPERATURE CALIBRATION, saved to calibration.json next to this script so it
survives reboots. Use `localhost` when running on the Pi itself.

  Forehead 3-5 cm from the sensor, and take the reference thermometer reading
  at the same moment (ideally a forehead/temporal IR thermometer, so both
  measure the same site). Repeat on several people; the offset is the MEDIAN
  of (reference - kiosk) across the saved samples.
      curl -X POST http://localhost:5000/api/calibration/temperature \
           -H "Content-Type: application/json" -d '{"referenceCelsius": 36.6}'

  Inspect / reset:
      curl http://localhost:5000/api/calibration
      curl -X POST http://localhost:5000/api/calibration/temperature/reset

  Optional protection: set CALIBRATION_TOKEN in the environment and send it
  as the X-Calibration-Token header on every calibration POST, so kiosk users
  can't recalibrate the device.
      CALIBRATION_TOKEN=mysecret python3 sensor_server.py

  SpO2 still uses the SPO2_OFFSET constant below (reference oximeter - kiosk).

  NOTE: this script reads `hrm.spo2`. If SpO2 always fails, your
  heartrate_monitor.py probably only prints SpO2 and never stores it. In
  that file's run_sensor(), after hrcalc returns, add `self.spo2 = spo2`.

Timing: both endpoints block while collecting data and return one result.
The frontend fetch timeout must be longer than 12 s (e.g. 15 s). Temperature
calibration also takes ~10 s because it runs a normal temperature reading.

Deliberately simple (one file, optional token only) for local testing on the
kiosk's own network. Lock it down before exposing it beyond that.
"""

import json
import os
import statistics
import threading
import time
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from smbus2 import SMBus
from mlx90614 import MLX90614
from heartrate_monitor import HeartRateMonitor

app = Flask(__name__)
CORS(app)  # allows the Vite dev server (different port) to fetch this during testing

I2C_BUS = 1

# --- Calibration storage ----------------------------------------------------

CALIBRATION_FILE = Path(__file__).with_name("calibration.json")
CALIBRATION_TOKEN = os.environ.get("CALIBRATION_TOKEN")
MAX_CAL_SAMPLES = 10  # keep the most recent reference samples


class CalibrationError(Exception):
    """Calibration could not be completed; message is safe to show the installer."""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _default_calibration() -> dict:
    return {
        "temperature": {
            "offsetC": 0.0,  # reference thermometer - kiosk reading
            "samples": [],
        },
    }


def load_calibration() -> dict:
    cal = _default_calibration()
    try:
        with open(CALIBRATION_FILE, "r", encoding="utf-8") as f:
            stored = json.load(f)
        if not isinstance(stored, dict):
            stored = {}
        for section, defaults in cal.items():
            stored_section = stored.get(section)
            if isinstance(stored_section, dict):
                for key in defaults:
                    if key in stored_section:
                        defaults[key] = stored_section[key]
    except (OSError, ValueError):
        # Missing or corrupt file: fall back to defaults rather than crash the kiosk.
        pass
    return cal


def save_calibration() -> None:
    tmp = CALIBRATION_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(calibration, f, indent=2)
    os.replace(tmp, CALIBRATION_FILE)  # atomic: never leaves a half-written file


calibration = load_calibration()


def _offset_from_samples(samples: list) -> float:
    """Median of (reference - raw) across saved samples."""
    return round(statistics.median(s["reference"] - s["raw"] for s in samples), 2)


def require_token(fn):
    """If CALIBRATION_TOKEN is set, calibration POSTs must send it."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if CALIBRATION_TOKEN and request.headers.get("X-Calibration-Token") != CALIBRATION_TOKEN:
            return jsonify({"error": "Calibration token missing or incorrect"}), 401
        return fn(*args, **kwargs)

    return wrapper


# --- Temperature (MLX90614) -------------------------------------------------

TEMP_SENSOR_ADDRESS = 0x5A

TEMP_SAMPLE_SECONDS = 10
TEMP_SAMPLE_INTERVAL = 0.25
TEMP_WARMUP_SECONDS = 1.0  # ignore the first moments while the user settles
TEMP_TRIM_FRACTION = 0.2  # drop this fraction from EACH end (spikes/dips)
TEMP_MAX_SPREAD_C = 0.5  # if the kept readings vary more than this, user moved
TEMP_VALID_RANGE_C = (25.0, 45.0)  # skin readings outside this are garbage

TEMP_REFERENCE_RANGE_C = (34.0, 42.0)  # accepted reference thermometer values
TEMP_MAX_OFFSET_C = 3.0  # a bigger correction means a bad reference or bad placement


def read_raw_object_temperature_celsius() -> float:
    """Stable, filtered reading with NO calibration offset applied."""
    bus = SMBus(I2C_BUS)
    try:
        sensor = MLX90614(bus, address=TEMP_SENSOR_ADDRESS)
        readings = []
        start = time.time()
        end = start + TEMP_SAMPLE_SECONDS
        while time.time() < end:
            value = sensor.get_obj_temp()
            if (
                time.time() - start >= TEMP_WARMUP_SECONDS
                and TEMP_VALID_RANGE_C[0] <= value <= TEMP_VALID_RANGE_C[1]
            ):
                readings.append(value)
            time.sleep(TEMP_SAMPLE_INTERVAL)

        # Need most of the window to be usable, otherwise forehead wasn't in range
        if len(readings) < 20:
            raise ValueError("No reliable reading - keep forehead 3-5 cm from the sensor")

        readings.sort()
        trim = int(len(readings) * TEMP_TRIM_FRACTION)
        core = readings[trim:len(readings) - trim] or readings

        if statistics.pstdev(core) > TEMP_MAX_SPREAD_C:
            raise ValueError("Movement detected - stay completely still and retry")

        return statistics.median(core)
    finally:
        bus.close()


def read_object_temperature_celsius() -> float:
    raw = read_raw_object_temperature_celsius()
    return round(raw + calibration["temperature"]["offsetC"], 1)


@app.route("/api/temperature", methods=["GET"])
def get_temperature():
    try:
        return jsonify({"celsius": read_object_temperature_celsius()}), 200
    except Exception as exc:
        print("ERROR:", exc, flush=True)
        return jsonify({"error": str(exc)}), 500


def calibrate_temperature(reference_c: float) -> dict:
    """Take a normal reading, compare to the reference thermometer, store the sample."""
    low, high = TEMP_REFERENCE_RANGE_C
    if not (low <= reference_c <= high):
        raise CalibrationError(f"referenceCelsius must be between {low} and {high}.")

    raw = read_raw_object_temperature_celsius()  # ValueError here = bad placement/movement
    difference = reference_c - raw
    if abs(difference) > TEMP_MAX_OFFSET_C:
        raise CalibrationError(
            f"Kiosk read {raw:.1f} C but the reference says {reference_c:.1f} C "
            f"(difference {difference:+.1f} C, more than {TEMP_MAX_OFFSET_C} C). "
            "Check the reference value and that the forehead was 3-5 cm from the sensor."
        )

    section = calibration["temperature"]
    samples = (section["samples"] + [{
        "raw": round(raw, 2),
        "reference": round(reference_c, 2),
        "at": _now_iso(),
    }])[-MAX_CAL_SAMPLES:]
    section["samples"] = samples
    section["offsetC"] = _offset_from_samples(samples)
    save_calibration()

    return {
        "rawCelsius": round(raw, 2),
        "referenceCelsius": round(reference_c, 2),
        "offsetC": section["offsetC"],
        "sampleCount": len(samples),
        "samples": samples,
    }


@app.route("/api/calibration/temperature", methods=["POST"])
@require_token
def post_calibrate_temperature():
    body = request.get_json(silent=True) or {}
    try:
        reference_c = float(body.get("referenceCelsius"))
    except (TypeError, ValueError):
        return jsonify({"error": 'Send JSON like {"referenceCelsius": 36.6}'}), 400
    try:
        return jsonify(calibrate_temperature(reference_c)), 200
    except (CalibrationError, ValueError) as exc:
        print("CALIBRATION:", exc, flush=True)
        return jsonify({"error": str(exc)}), 422
    except Exception as exc:
        print("ERROR:", exc, flush=True)
        return jsonify({"error": f"Sensor error: {exc}"}), 500


@app.route("/api/calibration/temperature/reset", methods=["POST"])
@require_token
def post_reset_temperature_calibration():
    calibration["temperature"] = _default_calibration()["temperature"]
    save_calibration()
    return jsonify(calibration["temperature"]), 200


# --- Heart rate / SpO2 (MAX30102) -------------------------------------------

SAMPLE_SECONDS = 12  # total time: calibration + sampling
CALIBRATION_SECONDS = 3  # let the sensor's signal gain settle before reading
POLL_INTERVAL = 1.0  # read the running bpm/spo2 once per second

BPM_MIN, BPM_MAX = 40, 200
SPO2_MIN, SPO2_MAX = 70, 100
MIN_VALID_SAMPLES = 4  # of ~9 polls, need at least this many good ones
MAX_BPM_SPREAD = 40  # kept bpm values varying more than this = unstable
SPO2_OFFSET = 0  # CALIBRATE: reference oximeter - kiosk reading

PLACEMENT_MSG = (
    "No reliable reading - lay your finger flat and gently on the sensor, "
    "don't press hard, and keep still"
)


def read_heart_rate_and_spo2() -> dict:
    hrm = HeartRateMonitor(print_raw=False, print_result=False)
    hrm.start_sensor()
    bpms, spo2s = [], []
    try:
        time.sleep(CALIBRATION_SECONDS)
        end = time.time() + (SAMPLE_SECONDS - CALIBRATION_SECONDS)
        while time.time() < end:
            time.sleep(POLL_INTERVAL)
            bpm = round(hrm.bpm, 0)
            spo2 = round(getattr(hrm, "spo2", 0), 0)
            print("bpm:", bpm, "spo2:", spo2, flush=True)  # DEBUG: remove once working
            # Only keep polls where BOTH values are physiologically plausible
            if BPM_MIN <= bpm <= BPM_MAX and SPO2_MIN <= spo2 <= SPO2_MAX:
                bpms.append(bpm)
                spo2s.append(spo2)
    finally:
        hrm.stop_sensor()

    if len(bpms) < MIN_VALID_SAMPLES:
        raise ValueError(PLACEMENT_MSG)

    if max(bpms) - min(bpms) > MAX_BPM_SPREAD:
        raise ValueError("Unstable reading - keep your finger still and retry")

    # Median ignores the occasional outlier poll
    bpm = int(statistics.median(bpms))
    spo2 = int(min(statistics.median(spo2s) + SPO2_OFFSET, SPO2_MAX))
    return {"bpm": bpm, "spo2": spo2}


@app.route("/api/heart-rate-spo2", methods=["GET"])
def get_heart_rate_spo2():
    try:
        return jsonify(read_heart_rate_and_spo2()), 200
    except Exception as exc:
        print("ERROR:", exc, flush=True)
        return jsonify({"error": str(exc)}), 500


# --- Weight (HX711 + 4 x 50 kg load cells) ---------------------------------
#
# Wiring (HX711 -> Raspberry Pi): VCC -> 3.3V (NOT 5V, the DT pin would output
# 5V and can damage the Pi), GND -> GND, DT -> GPIO 5, SCK -> GPIO 6.
# Avoid GPIO 2/3 (I2C: MAX30102 and VL53L1X use them).
#
# The scale is created lazily on the first weight request, so a wiring or
# GPIO-library problem only breaks the weight routes and never the
# temperature or heart-rate endpoints.

try:
    import RPi.GPIO as GPIO
except ImportError:  # lets the file still start on a PC / without the library
    GPIO = None

WEIGHT_DT_PIN = 5
WEIGHT_SCK_PIN = 6
WEIGHT_CALIBRATION_FILE = Path(__file__).with_name("weight_calibration.json")
WEIGHT_KNOWN_RANGE_KG = (1.0, 150.0)  # accepted calibration weights


class HX711:
    """Minimal bit-banged HX711 reader, channel A, gain 128."""

    def __init__(self, dt_pin=WEIGHT_DT_PIN, sck_pin=WEIGHT_SCK_PIN):
        if GPIO is None:
            raise RuntimeError("RPi.GPIO is not installed (pip install RPi.GPIO, or rpi-lgpio on a Pi 5).")
        self.dt = dt_pin
        self.sck = sck_pin
        self._lock = threading.Lock()
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        GPIO.setup(self.sck, GPIO.OUT, initial=GPIO.LOW)
        GPIO.setup(self.dt, GPIO.IN)

    def _wait_ready(self, timeout=1.0):
        end = time.time() + timeout
        while GPIO.input(self.dt) == 1:
            if time.time() > end:
                raise TimeoutError("HX711 not responding - check wiring and power.")
            time.sleep(0.001)

    def read_raw(self):
        """Return one signed 24-bit reading."""
        with self._lock:
            self._wait_ready()
            value = 0
            for _ in range(24):
                GPIO.output(self.sck, True)
                GPIO.output(self.sck, False)
                value = (value << 1) | GPIO.input(self.dt)
            # 25th pulse selects channel A, gain 128 for the next conversion
            GPIO.output(self.sck, True)
            GPIO.output(self.sck, False)
        if value & 0x800000:  # sign extend
            value -= 1 << 24
        return value

    def read_median(self, samples=10):
        """Median of several readings; drops glitches (all-ones / timing errors)."""
        vals = []
        for _ in range(samples):
            try:
                v = self.read_raw()
            except TimeoutError:
                continue
            if v in (-1, 0x7FFFFF, -0x800000):  # invalid / saturated
                continue
            vals.append(v)
        if len(vals) < max(3, samples // 2):
            raise RuntimeError("Too many bad HX711 readings - check wiring and power.")
        return statistics.median(vals)


class WeightSensor:
    """Weight in kg with tare + scale calibration saved to weight_calibration.json."""

    def __init__(self):
        self.hx = HX711()
        self.offset = 0.0   # raw value with an empty platform
        self.scale = 1.0    # raw units per kg
        self.calibrated = False
        self.tared = False  # True once tare() ran in this server session
        self._load()

    def _load(self):
        try:
            with open(WEIGHT_CALIBRATION_FILE, encoding="utf-8") as f:
                data = json.load(f)
            self.offset = float(data["offset"])
            self.scale = float(data["scale"])
            self.calibrated = self.scale != 0
        except (OSError, KeyError, ValueError):
            self.calibrated = False

    def _save(self):
        tmp = WEIGHT_CALIBRATION_FILE.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"offset": self.offset, "scale": self.scale}, f)
        os.replace(tmp, WEIGHT_CALIBRATION_FILE)

    def tare(self, samples=20):
        """Zero the scale. Platform must be empty."""
        self.offset = self.hx.read_median(samples)
        self.tared = True
        if self.calibrated:
            self._save()
        return self.offset

    def calibrate(self, known_kg, samples=30):
        """Call after tare(), with known_kg on the platform."""
        raw = self.hx.read_median(samples)
        diff = raw - self.offset
        if abs(diff) < 100:
            raise RuntimeError("No change detected - is the weight on the platform and the wiring correct?")
        self.scale = diff / known_kg  # a negative scale is fine (it flips the sign)
        self.calibrated = True
        self._save()
        return self.scale

    def read_kg(self, samples=10):
        if not self.calibrated:
            raise RuntimeError("Scale is not calibrated - run the tare and scale calibration steps first.")
        raw = self.hx.read_median(samples)
        return (raw - self.offset) / self.scale

    def measure_stable(self, timeout=15.0, tolerance_kg=0.2, window=5, min_kg=5.0):
        """
        Wait until the patient stands still: `window` consecutive readings within
        tolerance_kg of each other and above min_kg. Returns weight rounded to 0.1 kg.
        Raises TimeoutError if nobody steps on or the reading never settles.
        """
        end = time.time() + timeout
        recent = []
        while time.time() < end:
            w = self.read_kg(samples=5)
            recent.append(w)
            recent = recent[-window:]
            if (
                len(recent) == window
                and min(recent) >= min_kg
                and (max(recent) - min(recent)) <= tolerance_kg
            ):
                return round(statistics.mean(recent), 1)
            time.sleep(0.1)
        raise TimeoutError("No stable weight detected. Please stand still on the platform.")


_weight_sensor = None


def get_weight_sensor() -> WeightSensor:
    global _weight_sensor
    if _weight_sensor is None:
        _weight_sensor = WeightSensor()
    return _weight_sensor


@app.route("/api/weight", methods=["GET"])
def get_weight():
    try:
        return jsonify({"weightKg": get_weight_sensor().measure_stable()}), 200
    except Exception as exc:
        print("ERROR:", exc, flush=True)
        return jsonify({"error": str(exc)}), 500


@app.route("/api/calibration/weight/tare", methods=["POST"])
@require_token
def post_tare_weight():
    """Zero the scale. The platform MUST be empty."""
    try:
        offset = get_weight_sensor().tare()
        return jsonify({"offset": offset, "next": "Place a known weight and call /api/calibration/weight/scale"}), 200
    except Exception as exc:
        print("ERROR:", exc, flush=True)
        return jsonify({"error": str(exc)}), 500


@app.route("/api/calibration/weight/scale", methods=["POST"])
@require_token
def post_calibrate_weight_scale():
    """Set the scale factor. Tare first (empty platform), then put knownKg on it."""
    body = request.get_json(silent=True) or {}
    try:
        known_kg = float(body.get("knownKg"))
    except (TypeError, ValueError):
        return jsonify({"error": 'Send JSON like {"knownKg": 20}'}), 400
    try:
        low, high = WEIGHT_KNOWN_RANGE_KG
        if not (low <= known_kg <= high):
            raise CalibrationError(f"knownKg must be between {low:.0f} and {high:.0f}.")
        ws = get_weight_sensor()
        if not ws.tared:
            raise CalibrationError(
                "Tare first with the platform EMPTY (POST /api/calibration/weight/tare), "
                "then place the known weight and call this again."
            )
        scale = ws.calibrate(known_kg)
        return jsonify({"scale": scale, "offset": ws.offset, "knownKg": known_kg}), 200
    except (CalibrationError, RuntimeError) as exc:
        print("CALIBRATION:", exc, flush=True)
        return jsonify({"error": str(exc)}), 422
    except Exception as exc:
        print("ERROR:", exc, flush=True)
        return jsonify({"error": str(exc)}), 500


# --- Calibration overview ---------------------------------------------------

@app.route("/api/calibration", methods=["GET"])
def get_calibration():
    return jsonify(calibration), 200


if __name__ == "__main__":
    # threaded=False keeps one sensor read at a time on the shared I2C bus.
    app.run(host="0.0.0.0", port=5000, threaded=False)
