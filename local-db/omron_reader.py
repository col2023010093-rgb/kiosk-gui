import asyncio, secrets, datetime
from bleak import BleakScanner, BleakClient

ADDR   = "C4:E3:2A:13:68:A2"
UNLOCK = "b305b680-aee7-11e1-a730-0002a5d5c51b"
RX     = "49123040-aee8-11e1-a74d-0002a5d5c51b"
TX     = "db5b55e0-aee7-11e1-965e-0002a5d5c51b"
START_CMD = bytes.fromhex("0800000000100018")
END_CMD   = bytes.fromhex("080f000000000007")
REC_ADDR, REC_SIZE, SLOTS = 0x02E8, 14, 14

def build(ptype, addr, size):
    cmd = bytearray([0x08]) + bytes.fromhex(ptype)
    cmd += addr.to_bytes(2, "big") + bytes([size, 0x00])
    x = 0
    for b in cmd:
        x ^= b
    cmd.append(x)
    return bytes(cmd)

assert build("0000", 0, 0x10) == START_CMD
assert build("0f00", 0, 0) == END_CMD

def parse(d):
    if d[0] > 0xE1:
        return None
    f1 = d[4] | (d[5] << 8)
    f2 = d[6] | (d[7] << 8)
    try:
        when = datetime.datetime(2000 + (d[3] & 0x3F), (f1 >> 10) & 0x0F,
                                 (f1 >> 5) & 0x1F, f1 & 0x1F,
                                 min((f2 >> 6) & 0x3F, 59), min(f2 & 0x3F, 59))
    except ValueError:
        return None
    return dict(seq=int.from_bytes(d[10:12], "little"),
                measured_at=when.isoformat(sep=" "),
                systolic=d[0] + 25, diastolic=d[1], pulse=d[2],
                irregular=(f1 >> 14) & 1, movement=(f1 >> 15) & 1)

async def read_all(scan_timeout=30):
    """Return decoded records, or None if the monitor was not seen."""
    unlock_q, rx_q = asyncio.Queue(), asyncio.Queue()
    dev = await BleakScanner.find_device_by_address(ADDR, timeout=scan_timeout)
    if not dev:
        return None
    async with BleakClient(dev, timeout=30) as client:
        async def request(cmd):
            while not rx_q.empty():
                rx_q.get_nowait()
            await client.write_gatt_char(TX, cmd, response=True)
            frame = bytearray()
            while True:
                frame += await asyncio.wait_for(rx_q.get(), 5)
                if len(frame) >= frame[0]:
                    return bytes(frame)

        await client.start_notify(RX, lambda c, d: rx_q.put_nowait(bytes(d)))
        await asyncio.sleep(0.3)
        await client.start_notify(UNLOCK, lambda c, d: unlock_q.put_nowait(bytes(d)))
        await asyncio.sleep(0.3)

        token = secrets.token_bytes(4)
        pkt = b"\x11" + token + b"\x00" * 15
        ok = False
        for resp in (False, True):
            await client.write_gatt_char(UNLOCK, pkt, response=resp)
            try:
                while True:
                    d = await asyncio.wait_for(unlock_q.get(), 5)
                    if d[0] == 0x91 and d[1] == 0 and d[2:6] == token:
                        ok = True
                        break
            except asyncio.TimeoutError:
                pass
            if ok:
                break
        if not ok:
            raise RuntimeError("handshake failed")

        f = await request(START_CMD)
        if f[1] != 0x80:
            raise RuntimeError("session start failed")
        records = []
        try:
            for i in range(SLOTS):
                f = await request(build("0100", REC_ADDR + i * REC_SIZE, REC_SIZE))
                if f[f[0] - 2] != 0:
                    continue
                r = parse(f[6:f[0] - 2])
                if r:
                    records.append(r)
        finally:
            try:
                await request(END_CMD)
            except Exception:
                pass
        records.sort(key=lambda r: r["measured_at"])
        return records
