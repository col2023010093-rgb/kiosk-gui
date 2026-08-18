"""
Same as minimal_repro_server.py, but the sensor is opened ONCE at module
load time (before app.run()), and the route just calls get_distance() on
the already-open sensor — instead of creating/opening/closing a new
VL53L1X object on every request.
"""

import VL53L1X
from flask import Flask

app = Flask(__name__)

# Initialize the sensor once, at startup, not per-request.
tof = VL53L1X.VL53L1X(i2c_bus=1, i2c_address=0x29)
tof.open()
tof.start_ranging(1)


@app.route("/test")
def test():
    d = tof.get_distance()
    return f"distance: {d}"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
