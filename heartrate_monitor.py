"""
HeartRateMonitor wrapper for the MAX30102 (based on doug-burrell/max30102).

Change from the stock file: SpO2 is now STORED in self.spo2 instead of only
being printed, so sensor_server.py can read hrm.bpm and hrm.spo2.

Needs max30102.py and hrcalc.py from the same repo in this folder.
"""

import threading
import time

import numpy as np

import hrcalc
from max30102 import MAX30102


class HeartRateMonitor(object):
    """
    A class that encapsulates the max30102 device into a thread
    """

    LOOP_TIME = 0.01
    FINGER_THRESHOLD = 50000  # mean IR/red below this = no finger on sensor

    def __init__(self, print_raw=False, print_result=False):
        self.bpm = 0
        self.spo2 = 0
        if print_raw is True:
            print('IR, Red')
        self.print_raw = print_raw
        self.print_result = print_result

    def run_sensor(self):
        sensor = MAX30102()
        ir_data = []
        red_data = []
        bpms = []
        spo2s = []

        # run until told to stop
        while not self._thread.stopped:
            # check if any data is available
            num_bytes = sensor.get_data_present()
            if num_bytes > 0:
                # grab all the data and stash it into arrays
                while num_bytes > 0:
                    red, ir = sensor.read_fifo()
                    num_bytes -= 1
                    ir_data.append(ir)
                    red_data.append(red)
                    if self.print_raw:
                        print("{0}, {1}".format(ir, red))

                while len(ir_data) > 100:
                    ir_data.pop(0)
                    red_data.pop(0)

                if len(ir_data) == 100:
                    bpm, valid_bpm, spo2, valid_spo2 = hrcalc.calc_hr_and_spo2(
                        ir_data, red_data
                    )

                    if valid_bpm:
                        bpms.append(bpm)
                        while len(bpms) > 4:
                            bpms.pop(0)
                        self.bpm = np.mean(bpms)

                    # hrcalc returns -999 / valid_spo2 False when it can't compute SpO2
                    if valid_spo2 and 70 <= spo2 <= 100:
                        spo2s.append(spo2)
                        while len(spo2s) > 4:
                            spo2s.pop(0)
                        self.spo2 = np.mean(spo2s)

                    # No finger on the sensor: clear both values
                    if (
                        np.mean(ir_data) < self.FINGER_THRESHOLD
                        and np.mean(red_data) < self.FINGER_THRESHOLD
                    ):
                        self.bpm = 0
                        self.spo2 = 0
                        bpms.clear()
                        spo2s.clear()
                        if self.print_result:
                            print("Finger not detected")
                    elif self.print_result:
                        print("BPM: {0}, SpO2: {1}".format(self.bpm, self.spo2))

            time.sleep(self.LOOP_TIME)

        sensor.shutdown()

    def start_sensor(self):
        self._thread = threading.Thread(target=self.run_sensor)
        self._thread.stopped = False
        self._thread.start()

    def stop_sensor(self, timeout=2.0):
        self._thread.stopped = True
        self.bpm = 0
        self.spo2 = 0
        self._thread.join(timeout)
