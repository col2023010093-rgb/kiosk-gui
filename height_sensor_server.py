"""
Local API for reading height from a VL53L1X time-of-flight distance sensor
mounted overhead on a Raspberry Pi, with built-in calibration.

Hardware:
  VL53L1X wired over I2C (SDA/SCL), default I2C address 0x29.
  Mounted overhead, pointing straight down at the person's head.
  Enable I2C: `sudo raspi-config` -> Interface Options -> I2C.
  Check it's detected: `i2cdetect -y 1` should show 29.

How height is calculated:
      height_cm = mount_height_cm - distance_to_head_cm + offset_cm

  mount_height_cm : sensor's distance to the floor (set by FLOOR calibration)
  offset_cm       : small correction for sensor bias (set by REFERENCE calibration)

Calibration (values are saved to height_calibration.json and survive reboots):

  Step 1 - Floor calibration (empty platform, nobody underneath):
      curl -X POST http://<pi-ip>:5002/api/height/calibration/floor

  Step 2 - Reference calibration (someone of KNOWN height stands still
  directly under the sensor; measure them with a tape/stadiometer first):
      curl -X POST http://<pi-ip>:5002/api/height/calibration/reference \
           -H "Content-Type: application/json" \
           -d '{"trueHeightCm": 170.0}'

  Inspect / reset:
      curl http://<pi-ip>:5002/api/height/calibration
      curl -X POST http://<pi-ip>:5002/api/height/calibration/reset

  Optional protection: set CALIBRATION_TOKEN in the environment and send it
  as the X-Calibration-Token header on the POST calibration routes, so kiosk
  users can't recalibrate the device.
      CALIBRATION_TOKEN=mysecret python3 height_sensor_server.py

Install:
  pip install flask flask-cors smbus2 vl53l1x

Run:
  python3 height_sensor_server.py
  -> serves http://<pi-ip>:5002/api/height

Deliberately simple (one file, no auth beyond the optional token) for local
testing on the kiosk's own network. Lock it down before exposing it further.
"""

import json
import os
import statistics
import threading
import time
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

import VL53L1X
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allows the Vite dev server (different port) to fetch this during testing

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
I2C_BUS = 1
I2C_ADDRESS = 0x29

DEFAULT_MOUNT_HEIGHT_CM = 200.0  # used until floor calibration is run
DEFAULT_OFFSET_CM = 0.0

SAMPLE_COUNT = 7                 # samples per normal reading
CALIBRATION_SAMPLE_COUNT = 15    # more samples for calibration accuracy
MIN_VALID_SAMPLES = 3            # fewer valid samples than this = no reading
SAMPLE_DELAY_S = 0.05

MIN_HEIGHT_CM = 50               # anything shorter is treated as "nobody there"

# VL53L1X distance modes (pimoroni vl53l1x library)
MODE_SHORT = 1   # up to ~1.3 m  - best for measuring a head ~30-100 cm below the sensor
MODE_MEDIUM = 2  # up to ~2.9 m
MODE_LONG = 3    # up to ~3.6 m  - needed to see a floor ~2 m away

# Calibration sanity limits (reject obviously wrong calibrations)
FLOOR_MIN_CM = 100.0
FLOOR_MAX_CM = 350.0
MAX_FLOOR_SPREAD_CM = 1.5        # empty floor must read steadily
MAX_REFERENCE_SPREAD_CM = 2.5    # a standing person sways a bit more
MAX_OFFSET_CM = 10.0             # bigger than this means mount height is probably wrong
REFERENCE_MIN_CM = 100.0
REFERENCE_MAX_CM = 220.0

CALIBRATION_FILE = Path(__file__).with_name("height_calibration.json")
CALIBRATION_TOKEN = os.environ.get("CALIBRATION_TOKEN")

# One lock for the I2C sensor (Flask can serve requests on multiple threads)
# and one for the calibration state.
sensor_lock = threading.Lock()
calibration_lock = threading.Lock()


class CalibrationError(Exception):
    """Calibration could not be completed; message is safe to show the installer."""


# --------------------------------------------------------------------------
# Calibration storage
# --------------------------------------------------------------------------
def _default_calibration() -> dict:
    return {
        "mountHeightCm": DEFAULT_MOUNT_HEIGHT_CM,
        "offsetCm": DEFAULT_OFFSET_CM,
        "floorCalibratedAt": None,
        "referenceCalibratedAt": None,
        "referenceHeightCm": None,
    }


def load_calibration() -> dict:
    cal = _default_calibration()
    try:
        with open(CALIBRATION_FILE, "r", encoding="utf-8") as f:
            stored = json.load(f)
        for key in cal:
            if key in stored:
                cal[key] = stored[key]
    except FileNotFoundError:
        pass
    except (OSError, ValueError):
        # Corrupt file: fall back to defaults rather than crash the kiosk.
        pass
    return cal


def save_calibration(cal: dict) -> None:
    tmp = CALIBRATION_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cal, f, indent=2)
    os.replace(tmp, CALIBRATION_FILE)  # atomic: never leaves a half-written file


calibration = load_calibration()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# --------------------------------------------------------------------------
# Sensor access
# --------------------------------------------------------------------------
def sample_distances_cm(mode: int, count: int) -> list[float]:
    """Take `count` readings and return only the valid ones, in cm."""
    with sensor_lock:
        tof = VL53L1X.VL53L1X(i2c_bus=I2C_BUS, i2c_address=I2C_ADDRESS)
        tof.open()
        try:
            tof.start_ranging(mode)
            readings = []
            for _ in range(count):
                d_mm = tof.get_distance()
                if d_mm and d_mm > 0:  # 0 / negative = invalid frame
                    readings.append(d_mm / 10.0)
                time.sleep(SAMPLE_DELAY_S)
            tof.stop_ranging()
        finally:
            tof.close()
    return readings


def median_and_spread(readings_cm: list[float]) -> tuple[float, float]:
    return statistics.median(readings_cm), max(readings_cm) - min(readings_cm)


# --------------------------------------------------------------------------
# Height reading
# --------------------------------------------------------------------------
def read_height_cm() -> float:
    readings = sample_distances_cm(MODE_SHORT, SAMPLE_COUNT)
    if len(readings) < MIN_VALID_SAMPLES:
        raise ValueError("No valid height reading — make sure someone is standing under the sensor")

    with calibration_lock:
        mount = calibration["mountHeightCm"]
        offset = calibration["offsetCm"]

    distance_cm = statistics.median(readings)
    height_cm = mount - distance_cm + offset

    if height_cm < MIN_HEIGHT_CM or height_cm >= mount:
        raise ValueError("No valid height reading — make sure someone is standing under the sensor")

    return round(height_cm, 1)


# --------------------------------------------------------------------------
# Calibration routines
# --------------------------------------------------------------------------
def calibrate_floor() -> dict:
    """Measure the empty floor and store it as the mount height."""
    readings = sample_distances_cm(MODE_LONG, CALIBRATION_SAMPLE_COUNT)
    if len(readings) < MIN_VALID_SAMPLES + 2:
        raise CalibrationError(
            "Could not get enough valid readings of the floor. Check the sensor "
            "is pointing straight down, the floor is not glossy/black, and the "
            "platform is empty."
        )

    floor_cm, spread_cm = median_and_spread(readings)

    if not (FLOOR_MIN_CM <= floor_cm <= FLOOR_MAX_CM):
        raise CalibrationError(
            f"Measured {floor_cm:.1f} cm, which is outside the expected range "
            f"({FLOOR_MIN_CM:.0f}-{FLOOR_MAX_CM:.0f} cm). Make sure nobody is "
            "under the sensor and nothing is blocking it."
        )
    if spread_cm > MAX_FLOOR_SPREAD_CM:
        raise CalibrationError(
            f"Readings were unstable (spread {spread_cm:.1f} cm). Make sure the "
            "platform is empty and nothing is moving under the sensor, then retry."
        )

    with calibration_lock:
        previous = calibration["mountHeightCm"]
        calibration["mountHeightCm"] = round(floor_cm, 1)
        # Offset was tuned against the old mount height, so it is no longer valid.
        calibration["offsetCm"] = DEFAULT_OFFSET_CM
        calibration["floorCalibratedAt"] = _now_iso()
        calibration["referenceCalibratedAt"] = None
        calibration["referenceHeightCm"] = None
        save_calibration(calibration)
        result = dict(calibration)

    result["previousMountHeightCm"] = previous
    result["spreadCm"] = round(spread_cm, 2)
    result["samples"] = len(readings)
    return result


def calibrate_reference(true_height_cm: float) -> dict:
    """Use a person of known height to compute the correction offset."""
    if not (REFERENCE_MIN_CM <= true_height_cm <= REFERENCE_MAX_CM):
        raise CalibrationError(
            f"trueHeightCm must be between {REFERENCE_MIN_CM:.0f} and {REFERENCE_MAX_CM:.0f}."
        )

    readings = sample_distances_cm(MODE_SHORT, CALIBRATION_SAMPLE_COUNT)
    if len(readings) < MIN_VALID_SAMPLES + 2:
        raise CalibrationError(
            "Could not get enough valid readings. Make sure the person is "
            "standing directly under the sensor."
        )

    distance_cm, spread_cm = median_and_spread(readings)
    if spread_cm > MAX_REFERENCE_SPREAD_CM:
        raise CalibrationError(
            f"Readings were unstable (spread {spread_cm:.1f} cm). Ask the person "
            "to stand still, head level, directly under the sensor, then retry."
        )

    with calibration_lock:
        mount = calibration["mountHeightCm"]
        raw_height_cm = mount - distance_cm  # without any offset
        offset = true_height_cm - raw_height_cm

        if abs(offset) > MAX_OFFSET_CM:
            raise CalibrationError(
                f"Required correction ({offset:+.1f} cm) is too large. The mount "
                "height is probably wrong — run floor calibration first, and "
                "double-check the person's true height."
            )

        calibration["offsetCm"] = round(offset, 1)
        calibration["referenceCalibratedAt"] = _now_iso()
        calibration["referenceHeightCm"] = round(true_height_cm, 1)
        save_calibration(calibration)
        result = dict(calibration)

    result["rawHeightCm"] = round(raw_height_cm, 1)
    result["spreadCm"] = round(spread_cm, 2)
    result["samples"] = len(readings)
    return result


def reset_calibration() -> dict:
    with calibration_lock:
        calibration.clear()
        calibration.update(_default_calibration())
        save_calibration(calibration)
        return dict(calibration)


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
def require_token(fn):
    """If CALIBRATION_TOKEN is set, calibration POSTs must send it."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if CALIBRATION_TOKEN and request.headers.get("X-Calibration-Token") != CALIBRATION_TOKEN:
            return jsonify({"error": "Calibration token missing or incorrect"}), 401
        return fn(*args, **kwargs)

    return wrapper


@app.route("/api/height", methods=["GET"])
def get_height():
    try:
        return jsonify({"heightCm": read_height_cm()}), 200
    except Exception as exc:  # sensor disconnected, wrong address, nothing detected, etc.
        return jsonify({"error": str(exc)}), 500


@app.route("/api/height/calibration", methods=["GET"])
def get_calibration():
    with calibration_lock:
        return jsonify(dict(calibration)), 200


@app.route("/api/height/calibration/floor", methods=["POST"])
@require_token
def post_calibrate_floor():
    try:
        return jsonify(calibrate_floor()), 200
    except CalibrationError as exc:
        return jsonify({"error": str(exc)}), 422
    except Exception as exc:
        return jsonify({"error": f"Sensor error: {exc}"}), 500


@app.route("/api/height/calibration/reference", methods=["POST"])
@require_token
def post_calibrate_reference():
    body = request.get_json(silent=True) or {}
    try:
        true_height = float(body.get("trueHeightCm"))
    except (TypeError, ValueError):
        return jsonify({"error": "Send JSON like {\"trueHeightCm\": 170.0}"}), 400

    try:
        return jsonify(calibrate_reference(true_height)), 200
    except CalibrationError as exc:
        return jsonify({"error": str(exc)}), 422
    except Exception as exc:
        return jsonify({"error": f"Sensor error: {exc}"}), 500


@app.route("/api/height/calibration/reset", methods=["POST"])
@require_token
def post_reset_calibration():
    return jsonify(reset_calibration()), 200


if __name__ == "__main__":
    # host="0.0.0.0" so the frontend can reach it by the Pi's IP, not just localhost.
    # Port 5002: 5000 is sensor_server.py (temperature + heart-rate/SpO2).
    app.run(host="0.0.0.0", port=5002)
