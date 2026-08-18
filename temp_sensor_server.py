"""
Minimal local API for reading the MLX90614 IR temperature sensor on a
Raspberry Pi and serving it to the kiosk web app over HTTP.

Hardware:
  MLX90614 wired over I2C (SDA/SCL), default I2C address 0x5A.
  Make sure I2C is enabled: `sudo raspi-config` -> Interface Options -> I2C.
  Check it's detected: `i2cdetect -y 1` should show 5a.

Install:
  pip install flask flask-cors smbus2 mlx90614

Run:
  python3 temp_sensor_server.py
  -> serves http://<pi-ip>:5000/api/temperature

This is deliberately simple (one file, one route, no auth) for local testing
on the kiosk's own network. Lock it down before exposing it beyond that.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from smbus2 import SMBus
from mlx90614 import MLX90614

app = Flask(__name__)
CORS(app)  # allows the Vite dev server (different port) to fetch this during testing

I2C_BUS = 1          # Pi's default I2C bus
SENSOR_ADDRESS = 0x5A  # MLX90614 default address


def read_object_temperature_celsius() -> float:
    bus = SMBus(I2C_BUS)
    try:
        sensor = MLX90614(bus, address=SENSOR_ADDRESS)
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


if __name__ == "__main__":
    # host="0.0.0.0" so the frontend can reach it by the Pi's IP, not just localhost.
    app.run(host="0.0.0.0", port=5000)
