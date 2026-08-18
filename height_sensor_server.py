"""
Minimal local API for reading height from a VL53L1X time-of-flight distance
sensor mounted overhead on a Raspberry Pi, and serving it to the kiosk web
app over HTTP.

Hardware:
  VL53L1X wired over I2C (SDA/SCL), default I2C address 0x29.
  Mounted overhead, pointing straight down at the person's head.
  Make sure I2C is enabled: `sudo raspi-config` -> Interface Options -> I2C.
  Check it's detected: `i2cdetect -y 1` should show 29.

How height is calculated:
  The sensor only reports the DISTANCE from itself to whatever is directly
  below it — it has no concept of "height" on its own. Height is derived as:

      height_cm = MOUNT_HEIGHT_CM - distance_to_head_cm

  MOUNT_HEIGHT_CM below is set to 200 (the sensor's height off the floor,
  as measured during install). If you ever remount the sensor at a
  different height, this constant MUST be updated to match, or every
  reading will be off by exactly the difference.

Install:
  pip install flask flask-cors smbus2 vl53l1x

Run:
  python3 height_sensor_server.py
  -> serves http://<pi-ip>:5002/api/height

This is deliberately simple (one file, one route, no auth) for local testing
on the kiosk's own network. Lock it down before exposing it beyond that.
"""

import time

import VL53L1X
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allows the Vite dev server (different port) to fetch this during testing

I2C_BUS = 1
MOUNT_HEIGHT_CM = 200  # sensor's height off the floor — update if it's remounted
SAMPLE_COUNT = 5  # take a few readings and average, to smooth out single-frame noise


def read_height_cm() -> float:
    tof = VL53L1X.VL53L1X(i2c_bus=I2C_BUS, i2c_address=0x29)
    tof.open()
    try:
        tof.start_ranging(1)  # 1 = Short Range; switch to 2 (Medium) if readings look unstable at 3m
        readings_mm = []
        for _ in range(SAMPLE_COUNT):
            readings_mm.append(tof.get_distance())
            time.sleep(0.05)
        tof.stop_ranging()
    finally:
        tof.close()

    avg_distance_cm = (sum(readings_mm) / len(readings_mm)) / 10.0
    height_cm = MOUNT_HEIGHT_CM - avg_distance_cm

    if height_cm <= 0 or height_cm > MOUNT_HEIGHT_CM:
        # Sensor sees nothing in range, or something implausible (e.g. no
        # one standing under it) — don't return a nonsense height.
        raise ValueError("No valid height reading — make sure someone is standing under the sensor")

    return round(height_cm, 1)


@app.route("/api/height", methods=["GET"])
def get_height():
    try:
        height_cm = read_height_cm()
        return jsonify({"heightCm": height_cm}), 200
    except Exception as exc:  # sensor disconnected, wrong address, nothing detected, etc.
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    # host="0.0.0.0" so the frontend can reach it by the Pi's IP, not just localhost.
    # Port 5002: 5000 is temp_sensor_server.py, 5001 is heart_rate_spo2_server.py.
    app.run(host="0.0.0.0", port=5002)
