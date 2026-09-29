"""
Local API for the kiosk's Raspberry Pi sensors, serving readings to the
kiosk web app over HTTP. Combines what used to be two separate scripts
(temp_sensor_server.py and heart_rate_spo2_server.py) into one Flask app on
one port, so there's a single process to run/monitor on the Pi instead of
two, and one place for the next sensor (e.g. height/weight) to add a route.

Hardware:
  MLX90614 IR temperature sensor, wired over I2C, default address 0x5A.
  MAX30102 pulse oximetry sensor, wired over I2C, default address 0x57.
  Both share the Pi's I2C bus at different addresses, so they coexist fine.
  Make sure I2C is enabled: `sudo raspi-config` -> Interface Options -> I2C.
  Check both are detected: `i2cdetect -y 1` should show 5a and 57.

Driver:
  MLX90614 uses the `mlx90614` PyPI package directly.
  MAX30102 has no official CircuitPython library, so this uses the
  community driver from doug-burrell/max30102 (a maintained fork of the
  original vrano714 driver). Download these THREE files from
  https://github.com/doug-burrell/max30102 and place them in the same
  folder as this script:
    - max30102.py           (low-level I2C driver / FIFO polling)
    - hrcalc.py             (BPM + SpO2 calculation from raw samples)
    - heartrate_monitor.py  (HeartRateMonitor wrapper class used below)

Install:
  pip install flask flask-cors smbus2 mlx90614 numpy
  # numpy via apt is faster on a Pi: sudo apt install python3-numpy

Run:
  python3 sensor_server.py
  -> serves http://<pi-ip>:5000/api/temperature
  -> serves http://<pi-ip>:5000/api/heart-rate-spo2

Note on timing: unlike temperature, HR/SpO2 needs several seconds of steady
finger contact to produce a reliable reading (the sensor itself needs a
rolling window of samples). That endpoint blocks for SAMPLE_SECONDS while it
collects data, then returns one result — it is not a live stream.

This is deliberately simple (one file, no auth) for local testing on the
kiosk's own network. Lock it down before exposing it beyond that.

A future height/weight sensor endpoint (see height_sensor_server.py) can be
folded into this file the same way: add its read function and an
@app.route(...) below, and point measurement.ts at this same port.
"""

import time
import os

from flask import Flask, jsonify
from flask_cors import CORS
from smbus2 import SMBus
from mlx90614 import MLX90614
from heartrate_monitor import HeartRateMonitor

app = Flask(__name__)
allowed_origins = [origin.strip() for origin in os.getenv("SENSOR_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]
CORS(app, origins=allowed_origins)

# --- Temperature (MLX90614) -------------------------------------------------

I2C_BUS = 1  # Pi's default I2C bus
TEMP_SENSOR_ADDRESS = 0x5A  # MLX90614 default address


def read_object_temperature_celsius() -> float:
    bus = SMBus(I2C_BUS)
    try:
        sensor = MLX90614(bus, address=TEMP_SENSOR_ADDRESS)
        # get_object_1() = what the sensor is pointed at (skin/forehead temp).
        # get_ambient() is also available if you ever need room temperature instead.
        return round(sensor.get_obj_temp(), 1)
    finally:
        bus.close()


@app.route("/api/temperature", methods=["GET"])
def get_temperature():
    try:
        celsius = read_object_temperature_celsius()
        return jsonify({"celsius": celsius}), 200
    except Exception as exc:  # sensor disconnected, wrong address, etc.
        return jsonify({"error": str(exc)}), 500


# --- Heart rate / SpO2 (MAX30102) -------------------------------------------

SAMPLE_SECONDS = 5  # how long to let the sensor collect data before reading bpm/spo2


def read_heart_rate_and_spo2() -> dict:
    hrm = HeartRateMonitor(print_raw=False, print_result=False)
    hrm.start_sensor()
    try:
        time.sleep(SAMPLE_SECONDS)
        bpm = round(hrm.bpm, 0)
        spo2 = round(getattr(hrm, "spo2", 0), 0)
    finally:
        hrm.stop_sensor()

    if bpm <= 0:
        # No valid reading — almost always means no finger on the sensor,
        # or it moved during sampling.
        raise ValueError("No reliable reading — check finger placement on sensor")

    return {"bpm": int(bpm), "spo2": int(spo2)}


@app.route("/api/heart-rate-spo2", methods=["GET"])
def get_heart_rate_spo2():
    try:
        reading = read_heart_rate_and_spo2()
        return jsonify(reading), 200
    except Exception as exc:  # sensor disconnected, no finger, wrong address, etc.
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    # host="0.0.0.0" so the frontend can reach it by the Pi's IP, not just localhost.
    app.run(host=os.getenv("SENSOR_HOST", "127.0.0.1"), port=5000)
