"""
Minimal local API for reading heart rate (BPM) and blood oxygen saturation
(SpO2) from the MAX30102 pulse oximetry sensor on a Raspberry Pi, and serving
it to the kiosk web app over HTTP.

Hardware:
  MAX30102 wired over I2C (SDA/SCL), default I2C address 0x57.
  Make sure I2C is enabled: `sudo raspi-config` -> Interface Options -> I2C.
  Check it's detected: `i2cdetect -y 1` should show 57.

Driver:
  There is no official Adafruit CircuitPython library for the MAX30102, so
  this uses the community driver from doug-burrell/max30102 (a maintained
  fork of the original vrano714 driver). Download these THREE files from
  https://github.com/doug-burrell/max30102 and place them in the same
  folder as this script:
    - max30102.py       (low-level I2C driver / FIFO polling)
    - hrcalc.py          (BPM + SpO2 calculation from raw samples)
    - heartrate_monitor.py  (HeartRateMonitor wrapper class used below)

Install:
  pip install flask flask-cors smbus numpy
  # numpy via apt is faster on a Pi: sudo apt install python3-numpy

Run:
  python3 heart_rate_spo2_server.py
  -> serves http://<pi-ip>:5001/api/heart-rate-spo2

  NOTE: your existing temp_sensor_server.py also listens on port 5000. If
  you run both scripts on the Pi at the same time, they can't share that
  port, so this one is set to 5001 instead. Two options going forward:
    1. Keep them as separate scripts on separate ports (5000 + 5001), and
       point the frontend at two different URLs. Simplest for now.
    2. Merge both into one Flask app with two routes (e.g. sensor_server.py
       with /api/temperature and /api/heart-rate-spo2) sharing one port.
       Cleaner long-term if you'll keep adding sensors (BP, height/weight).
  This file assumes option 1 so it doesn't touch your working temp server.

Note on timing: unlike temperature, HR/SpO2 needs several seconds of steady
finger contact to produce a reliable reading (the sensor itself needs a
rolling window of samples). This endpoint blocks for SAMPLE_SECONDS while it
collects data, then returns one result — it is not a live stream.

This is deliberately simple (one file, one route, no auth) for local testing
on the kiosk's own network. Lock it down before exposing it beyond that.
"""

import time

from flask import Flask, jsonify
from flask_cors import CORS
from heartrate_monitor import HeartRateMonitor

app = Flask(__name__)
CORS(app)  # allows the Vite dev server (different port) to fetch this during testing

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
    app.run(host="0.0.0.0", port=5001)
