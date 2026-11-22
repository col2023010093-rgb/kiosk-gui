import os
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import local_db  # noqa: E402
import sync_worker  # noqa: E402


PID = "11111111-1111-4111-8111-111111111111"


def good(**over):
    base = {"patient_id": PID, "heart_rate": 72, "spo2": 98, "temperature": 36.7,
            "height_cm": 170, "weight_kg": 65}
    base.update(over)
    return base


class DbCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "k.db")
        self.conn = local_db.init_db(self.path)

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()


class TestRecords(DbCase):
    def test_init_is_idempotent(self):
        local_db.init_db(self.path).close()
        local_db.init_db(self.path).close()

    def test_insert_computes_bmi_and_starts_pending(self):
        saved = local_db.insert_record(self.conn, good())
        self.assertEqual(saved["bmi"], 22.5)
        self.assertEqual(saved["sync_status"], "pending")
        uuid.UUID(saved["record_id"])

    def test_simulated_is_rejected(self):
        with self.assertRaises(local_db.ValidationError):
            local_db.insert_record(self.conn, good(simulated=True))

    def test_out_of_range_and_empty_rejected(self):
        for bad in (good(temperature=80), good(spo2=120), {"patient_id": PID},
                    good(heart_rate="abc"), {"heart_rate": 70},
                    good(patient_id="p1"), good(patient_id="1"), good(measured_by="staff-1")):
            with self.assertRaises(local_db.ValidationError):
                local_db.insert_record(self.conn, bad)

    def test_duplicate_record_id_is_ignored(self):
        rid = str(uuid.uuid4())
        local_db.insert_record(self.conn, good(record_id=rid))
        local_db.insert_record(self.conn, good(record_id=rid))
        n = self.conn.execute("SELECT COUNT(*) FROM local_health_records").fetchone()[0]
        self.assertEqual(n, 1)

    @unittest.skipIf(os.name == "nt", "POSIX permissions not supported on Windows")
    def test_file_permissions_owner_only(self):
        self.assertEqual(os.stat(self.path).st_mode & 0o777, 0o600)


class TestSync(DbCase):
    def _fill(self, n=3):
        return [local_db.insert_record(self.conn, good(patient_id=str(uuid.uuid4())))["record_id"]
                for i in range(n)]

    def test_accepted_rows_become_synced(self):
        ids = self._fill()
        sent = []

        def send(payload):
            sent.append(payload)
            return {"accepted": [r["record_id"] for r in payload["records"]], "rejected": []}

        self.assertEqual(sync_worker.push_pending(self.conn, send), (3, 0))
        self.assertEqual(local_db.sync_status(self.conn)["synced"], 3)
        # second run sends nothing
        sync_worker.push_pending(self.conn, send)
        self.assertEqual(len(sent), 1)
        self.assertEqual(set(sent[0]["records"][0]), set(sync_worker.PUSH_FIELDS))
        self.assertTrue(all(i for i in ids))

    def test_network_failure_keeps_rows_pending_without_burning_attempts(self):
        self._fill()

        def send(_):
            raise sync_worker.SyncNetworkError("timeout")

        result = sync_worker.run(self.conn, send)
        self.assertFalse(result["ok"])
        st = local_db.sync_status(self.conn)
        self.assertEqual(st["pending"], 3)
        attempts = self.conn.execute(
            "SELECT MAX(sync_attempts) FROM local_health_records").fetchone()[0]
        self.assertEqual(attempts, 0)

    def test_partial_rejection_marks_only_bad_rows(self):
        ids = self._fill()

        def send(payload):
            ok = [r["record_id"] for r in payload["records"] if r["record_id"] != ids[1]]
            return {"accepted": ok, "rejected": [{"record_id": ids[1], "reason": "unknown patient"}]}

        sync_worker.push_pending(self.conn, send, batch_size=10)
        row = self.conn.execute("SELECT * FROM local_health_records WHERE record_id=?",
                                (ids[1],)).fetchone()
        self.assertEqual(row["sync_status"], "failed")
        self.assertEqual(row["last_error"], "unknown patient")
        self.assertEqual(local_db.sync_status(self.conn)["synced"], 2)

    def test_failed_rows_stop_retrying_after_max_attempts(self):
        rid = self._fill(1)[0]
        for _ in range(local_db.MAX_ATTEMPTS):
            local_db.mark_rejected(self.conn, rid, "bad")
        self.assertEqual(local_db.pending_records(self.conn), [])

    def test_silent_server_does_not_loop_forever(self):
        self._fill(2)
        accepted, rejected = sync_worker.push_pending(self.conn, lambda p: {})
        self.assertEqual((accepted, rejected), (0, 2))

    def test_server_cannot_ack_ids_we_did_not_send(self):
        self._fill(1)
        sync_worker.push_pending(
            self.conn, lambda p: {"accepted": [str(uuid.uuid4())], "rejected": []})
        self.assertEqual(local_db.sync_status(self.conn)["synced"], 0)

    def test_pull_patients_paginates_and_swaps(self):
        pages = {0: {"patients": [{"patient_id": 1, "identification_number": "A1"}], "has_more": True},
                 1: {"patients": [{"patient_id": 2, "identification_number": "B2",
                                   "first_name": "Ana"}], "has_more": False}}
        n = sync_worker.pull_patients(self.conn, lambda p: pages[p["page"]])
        self.assertEqual(n, 2)
        self.assertEqual(local_db.lookup_patient(self.conn, " B2 ")["first_name"], "Ana")
        # an empty server response must NOT wipe a populated cache
        with self.assertRaises(RuntimeError):
            sync_worker.pull_patients(
                self.conn, lambda p: {"patients": [], "has_more": False})
        self.assertIsNotNone(local_db.lookup_patient(self.conn, "B2"))

        # a later non-empty pull replaces the cache entirely
        sync_worker.pull_patients(
            self.conn,
            lambda p: {"patients": [{"patient_id": 3, "identification_number": "C3"}],
                       "has_more": False})
        self.assertIsNone(local_db.lookup_patient(self.conn, "B2"))
        self.assertIsNotNone(local_db.lookup_patient(self.conn, "C3"))
        self.assertIsNone(local_db.lookup_patient(self.conn, "B2"))

    def test_failed_pull_leaves_cache_untouched(self):
        local_db.replace_patients(self.conn, [{"patient_id": 1, "identification_number": "A1"}])
        calls = {"n": 0}

        def send(p):
            calls["n"] += 1
            if calls["n"] == 2:
                raise sync_worker.SyncNetworkError("drop")
            return {"patients": [{"patient_id": 9, "identification_number": "Z9"}], "has_more": True}

        with self.assertRaises(sync_worker.SyncNetworkError):
            sync_worker.pull_patients(self.conn, send)
        self.assertIsNotNone(local_db.lookup_patient(self.conn, "A1"))
        self.assertIsNone(local_db.lookup_patient(self.conn, "Z9"))

    def test_purge_only_removes_old_synced_rows(self):
        a, b = self._fill(2)
        local_db.mark_synced(self.conn, [a])
        self.conn.execute("UPDATE local_health_records SET synced_at='2020-01-01T00:00:00.000Z' "
                          "WHERE record_id=?", (a,))
        self.assertEqual(local_db.purge_synced(self.conn), 1)
        left = [r["record_id"] for r in local_db.list_records(self.conn)]
        self.assertEqual(left, [b])  # unsynced row is never purged

    def test_full_run_records_sync_run(self):
        self._fill()

        def send(p):
            if p["action"] == "push_records":
                return {"accepted": [r["record_id"] for r in p["records"]], "rejected": []}
            return {"patients": [{"patient_id": 1, "identification_number": "A1"}], "has_more": False}

        result = sync_worker.run(self.conn, send)
        self.assertEqual((result["ok"], result["pushed"], result["pulled"]), (True, 3, 1))
        self.assertIsNotNone(local_db.sync_status(self.conn)["last_successful_sync"])


class TestApi(DbCase):
    def setUp(self):
        super().setUp()
        os.environ["KIOSK_DB_PATH"] = self.path
        local_db.DB_PATH = self.path
        import local_api
        self.client = local_api.app.test_client()

    def test_post_and_get_record(self):
        r = self.client.post("/api/local/records", json=good())
        self.assertEqual(r.status_code, 201)
        got = self.client.get(f"/api/local/records?patient_id={PID}").get_json()
        self.assertEqual(len(got["records"]), 1)

    def test_post_validation_errors_are_422(self):
        self.assertEqual(self.client.post("/api/local/records", json=good(simulated=True)).status_code, 422)
        self.assertEqual(self.client.post("/api/local/records", data="nope").status_code, 422)

    def test_lookup_and_status(self):
        local_db.replace_patients(self.conn, [{"patient_id": 1, "identification_number": "A1"}])
        self.assertEqual(self.client.get("/api/local/patients/lookup?identification_number=A1").status_code, 200)
        self.assertEqual(self.client.get("/api/local/patients/lookup?identification_number=nope").status_code, 404)
        self.assertEqual(self.client.get("/api/local/sync/status").get_json()["cached_patients"], 1)

    def test_manual_sync_disabled_without_token(self):
        self.assertEqual(self.client.post("/api/local/sync/run").status_code, 403)


if __name__ == "__main__":
    unittest.main()
