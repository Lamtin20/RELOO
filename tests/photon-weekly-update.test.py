"""Offline transaction tests; no Docker/network or production index changes."""
import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zstandard

spec = importlib.util.spec_from_file_location('updater', Path(__file__).resolve().parents[1] / 'deploy/maps/photon_weekly_update.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Publisher:
    payload = zstandard.ZstdCompressor().compress(b'{"type":"Feature"}\n')

    def latest(self):
        return {'md5': hashlib.md5(self.payload).hexdigest(), 'url': module.BASE + module.LATEST}

    def download(self, metadata, path):
        path.write_bytes(self.payload)


class Ops:
    def __init__(self, fail_health=0, fail_stop=False):
        self.checks = 0
        self.stopped = []
        self.fail_health = fail_health
        self.fail_stop = fail_stop

    def build(self, release, jar):
        (release / 'index' / 'photon_data').mkdir(parents=True)

    def start(self, *args):
        pass

    def healthy(self, slot):
        self.checks += 1
        if self.checks == self.fail_health:
            raise RuntimeError('CANDIDATE_HEALTH_FAILED')

    def stop(self, slot):
        self.stopped.append(slot)
        if self.fail_stop:
            raise RuntimeError('DOCKER_COMMAND_FAILED')


class TransactionTests(unittest.TestCase):
    def setUp(self):
        disk = patch.object(module.shutil, 'disk_usage', return_value=type('Usage', (), {'free': 100 * 1024**3})())
        disk.start()
        self.addCleanup(disk.stop)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'photon-1.3.0.jar').write_bytes(b'fixture')
        self.old = {'schemaVersion': 1, 'slot': 'a', 'sha256': '1' * 64, 'md5': '0' * 32}
        (self.root / 'state').mkdir()
        module.atomic_json(self.root / 'state/active.json', self.old)

    def updater(self, **kwargs):
        return module.PhotonUpdater(self.root, jar_sha256=hashlib.sha256(b'fixture').hexdigest(), publisher=Publisher(), **kwargs)

    def test_update_and_unchanged_do_not_rebuild(self):
        ops = Ops()
        updater = self.updater(ops=ops)
        self.assertEqual(updater.run(), 'UPDATED')
        self.assertEqual(module.read_json(self.root / 'state/active.json')['slot'], 'b')
        self.assertEqual(ops.stopped, ['a'])
        self.assertEqual(updater.run(), 'UNCHANGED')
        self.assertEqual(ops.checks, 2)

    def test_pre_and_post_switch_failure_restore_previous(self):
        for fail in [1, 2]:
            with self.subTest(fail=fail):
                ops = Ops(fail_health=fail)
                with self.assertRaisesRegex(RuntimeError, 'HEALTH'):
                    self.updater(ops=ops).run()
                self.assertEqual(module.read_json(self.root / 'state/active.json'), self.old)
                self.assertEqual(ops.stopped, ['b'])

    def test_cleanup_failure_never_rolls_back_healthy_slot(self):
        ops = Ops(fail_stop=True)
        self.assertEqual(self.updater(ops=ops).run(), 'UPDATED')
        self.assertEqual(module.read_json(self.root / 'state/active.json')['slot'], 'b')
        self.assertEqual(module.read_json(self.root / 'state/last-run.json')['cleanupWarning'], 'CLEANUP_PENDING')

    def test_checksum_failure_preserves_pointer(self):
        updater = self.updater(ops=Ops())
        updater.publisher.download = lambda metadata, path: path.write_bytes(b'corrupt')
        with self.assertRaisesRegex(RuntimeError, 'CHECKSUM'):
            updater.run()
        self.assertEqual(module.read_json(self.root / 'state/active.json'), self.old)

    def test_disk_budget_preserves_pointer(self):
        with patch.object(module.shutil, 'disk_usage', return_value=type('Usage', (), {'free': 0})()):
            with self.assertRaisesRegex(RuntimeError, 'DISK_BUDGET'):
                self.updater(ops=Ops()).run()
        self.assertEqual(module.read_json(self.root / 'state/active.json'), self.old)

    def test_killed_transaction_restores_previous_before_checking_source(self):
        current = {**self.old, 'slot': 'b', 'sha256': '2' * 64}
        module.atomic_json(self.root / 'state/pending.json', {'old': self.old, 'current': current})
        module.atomic_json(self.root / 'state/active.json', current)
        updater = self.updater(ops=Ops())
        updater.publisher.latest = lambda: {'md5': self.old['md5']}
        self.assertEqual(updater.run(), 'UNCHANGED')
        self.assertEqual(module.read_json(self.root / 'state/active.json'), self.old)

    def test_exclusive_lock(self):
        with module.exclusive_lock(self.root / 'update.lock'):
            with self.assertRaises(OSError):
                with module.exclusive_lock(self.root / 'update.lock'):
                    self.fail('second lock acquired')


if __name__ == '__main__':
    unittest.main()
