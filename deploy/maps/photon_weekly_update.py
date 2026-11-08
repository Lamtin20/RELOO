"""Fixed-purpose Photon Vietnam data updater. Never upgrades software or touches listings.

Only managed inactive slots/releases may be replaced. Activation is an atomic public
state pointer read by the backend; the old slot stays alive until post-switch checks.
"""
import argparse
import contextlib
import datetime
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.parse
import urllib.request

BASE = 'https://download1.graphhopper.com/public/asia/vietnam/'
LATEST = 'photon-dump-vietnam-1.0-latest.jsonl.zst'
JAR_SHA256 = 'a89707c0045e4807b2a1180e132e68e108d998709f48b6c94b98a6e281f571a5'
IMAGE = 'eclipse-temurin@sha256:0b99b3376fbb50dbf9c0af8535fdd5b8eb0d3fdfc8b1e4967f383b6919f6901a'
NETWORK = 'reloo-map-private'
OWNER = 'reloo-photon-weekly-v1'
SCHEDULE = {'calendar': 'Mon *-*-* 00:00:00 Asia/Ho_Chi_Minh', 'timezone': 'Asia/Ho_Chi_Minh'}


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def digest(path, algorithm='sha256'):
    h = hashlib.new(algorithm)
    with Path(path).open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def atomic_json(path, value):
    path = Path(path)
    temp = path.with_name(path.name + '.next')
    with temp.open('w', encoding='utf8') as out:
        json.dump(value, out, ensure_ascii=False, indent=2)
        out.flush()
        os.fsync(out.fileno())
    os.chmod(temp, 0o644)  # Public operational metadata, read-only mount for app.
    os.replace(temp, path)


def read_json(path):
    path = Path(path)
    if not path.exists():
        return None
    if path.is_symlink() or path.stat().st_size > 16000:
        raise RuntimeError('STATE_INVALID')
    return json.loads(path.read_text(encoding='utf8'))


@contextlib.contextmanager
def exclusive_lock(path):
    fd = os.open(str(path), os.O_CREAT | os.O_RDWR, 0o600)
    try:
        if os.name == 'nt':
            import msvcrt
            if os.fstat(fd).st_size == 0:
                os.write(fd, b'0')
            os.lseek(fd, 0, os.SEEK_SET)
            msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        os.close(fd)


class SamePublisherRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not newurl.startswith(BASE):
            raise RuntimeError('PUBLISHER_REDIRECT_DENIED')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError('HEALTH_REDIRECT_DENIED')


class Publisher:
    def __init__(self):
        self.opener = urllib.request.build_opener(SamePublisherRedirect())

    def latest(self):
        with self.opener.open(BASE + LATEST + '.md5', timeout=30) as response:
            text = response.read(4097).decode('ascii')
        match = re.fullmatch(r'\s*([a-fA-F0-9]{32})\s+\*?(photon-dump-vietnam-(?:release-\d{6}|1\.0-latest)\.jsonl\.zst)\s*', text)
        if not match:
            raise RuntimeError('PUBLISHER_CHECKSUM_INVALID')
        return {'md5': match[1].lower(), 'file': match[2], 'url': BASE + match[2]}

    def download(self, metadata, path):
        if not metadata['url'].startswith(BASE):
            raise RuntimeError('PUBLISHER_URL_INVALID')
        total = 0
        with self.opener.open(metadata['url'], timeout=60) as response, Path(path).open('xb') as out:
            for chunk in iter(lambda: response.read(1024 * 1024), b''):
                total += len(chunk)
                if total > 250000000:
                    raise RuntimeError('DOWNLOAD_SIZE_LIMIT')
                out.write(chunk)


def decompress(source, target):
    import zstandard
    total = 0
    with Path(source).open('rb') as data, Path(target).open('xb') as out, zstandard.ZstdDecompressor().stream_reader(data) as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            total += len(chunk)
            if total > 3000000000:
                raise RuntimeError('DECOMPRESSION_SIZE_LIMIT')
            out.write(chunk)
    if total == 0:
        raise RuntimeError('EMPTY_DATASET')


class DockerOps:
    @staticmethod
    def command(args, *, check=True, timeout=60):
        result = subprocess.run(['docker', *args], capture_output=True, text=True, timeout=timeout, check=False)
        if check and result.returncode:
            raise RuntimeError('DOCKER_COMMAND_FAILED')
        return result

    def remove_inactive(self, slot):
        name = 'reloo-photon-' + slot
        result = self.command(['inspect', name], check=False)
        if result.returncode:
            return
        labels = json.loads(result.stdout)[0]['Config'].get('Labels') or {}
        if labels.get('reloo.photon.updater') != OWNER or labels.get('reloo.photon.slot') != slot:
            raise RuntimeError('FOREIGN_CONTAINER_PRESERVED')
        self.command(['rm', '-f', name])

    def build(self, release, jar):
        index = release / 'index'
        index.mkdir()
        if os.name != 'nt':
            os.chown(index, 1000, 1000)
            os.chmod(release, 0o755)
        args = ['docker', 'run', '--rm', '--name', 'reloo-photon-import', '--label', 'reloo.photon.updater=' + OWNER,
                '--network', 'none', '--read-only', '--user', '1000:1000', '--cpus', '2', '--memory', '2304m',
                '--pids-limit', '256', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
                '--tmpfs', '/tmp:size=128m,uid=1000,gid=1000', '-v', str(jar) + ':/opt/photon.jar:ro',
                '-v', str(release) + ':/release', IMAGE, 'java', '-Xms256m', '-Xmx1536m', '-XX:ActiveProcessorCount=2',
                '-jar', '/opt/photon.jar', 'import', '-data-dir', '/release/index', '-import-file', '/release/source.jsonl',
                '-languages', 'vi,en', '-j', '2']
        with (release / 'import.log').open('wb') as log:
            process = subprocess.Popen(args, stdout=log, stderr=subprocess.STDOUT)
            deadline = time.monotonic() + 5400
            try:
                while process.poll() is None:
                    if time.monotonic() > deadline or shutil.disk_usage(release).free < 2 * 1024**3:
                        raise RuntimeError('IMPORT_RESOURCE_LIMIT')
                    time.sleep(1)
                if process.returncode:
                    raise RuntimeError('IMPORT_FAILED')
            finally:
                if process.poll() is None:
                    self.command(['stop', '-t', '10', 'reloo-photon-import'], check=False)
                    process.wait(timeout=20)
        if not (index / 'photon_data').is_dir():
            raise RuntimeError('INDEX_MISSING')

    def start(self, slot, release, jar):
        self.remove_inactive(slot)
        self.command(['run', '-d', '--name', 'reloo-photon-' + slot, '--label', 'reloo.photon.updater=' + OWNER,
                      '--label', 'reloo.photon.slot=' + slot, '--network', NETWORK, '--network-alias', 'map-geocoder-' + slot,
                      '--restart', 'unless-stopped', '--read-only', '--user', '1000:1000', '--cpus', '2', '--memory', '2304m',
                      '--pids-limit', '256', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
                      '--tmpfs', '/tmp:size=128m,uid=1000,gid=1000', '-v', str(jar) + ':/opt/photon.jar:ro',
                      '-v', str(release / 'index') + ':/data', IMAGE, 'java', '-Xms256m', '-Xmx1536m', '-XX:ActiveProcessorCount=2',
                      '-jar', '/opt/photon.jar', 'serve', '-listen-ip', '0.0.0.0', '-listen-port', '2322', '-data-dir', '/data',
                      '-max-results', '5', '-max-reverse-results', '5'])

    def healthy(self, slot):
        data = json.loads(self.command(['inspect', 'reloo-photon-' + slot]).stdout)[0]
        address = data['NetworkSettings']['Networks'][NETWORK]['IPAddress']
        if not ipaddress.ip_address(address).is_private:
            raise RuntimeError('CANDIDATE_NETWORK_INVALID')
        paths = ['/api/?q=Ha%20Noi&limit=2', '/api/?q=Ho%20Chi%20Minh&limit=2', '/reverse?lat=10.77&lon=106.7&limit=2']
        deadline = time.monotonic() + 120
        while True:
            try:
                for path in paths:
                    with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect()).open('http://' + address + ':2322' + path, timeout=5) as response:
                        result = json.loads(response.read(512000))
                    if result.get('type') != 'FeatureCollection' or not result.get('features'):
                        raise RuntimeError('CANDIDATE_SEARCH_FAILED')
                return
            except Exception:
                if time.monotonic() >= deadline:
                    raise RuntimeError('CANDIDATE_HEALTH_FAILED') from None
                time.sleep(2)

    def stop(self, slot):
        result = self.command(['inspect', 'reloo-photon-' + slot], check=False)
        if result.returncode:
            return
        labels = json.loads(result.stdout)[0]['Config'].get('Labels') or {}
        if labels.get('reloo.photon.updater') != OWNER or labels.get('reloo.photon.slot') != slot:
            raise RuntimeError('FOREIGN_CONTAINER_PRESERVED')
        self.command(['stop', '-t', '30', 'reloo-photon-' + slot])


class PhotonUpdater:
    def __init__(self, root, *, publisher=None, ops=None, jar_sha256=JAR_SHA256):
        path = Path(root)
        if path.is_symlink():
            raise RuntimeError('ROOT_SYMLINK_DENIED')
        self.root = path.resolve()
        self.publisher = publisher or Publisher()
        self.ops = ops or DockerOps()
        self.jar_sha256 = jar_sha256

    def status(self, outcome, **extra):
        atomic_json(self.root / 'state' / 'last-run.json', {'schemaVersion': 1, 'outcome': outcome, 'at': utc_now(), 'schedule': SCHEDULE, **extra})

    def run(self):
        self.root.mkdir(parents=True, exist_ok=True)
        for name in ['state', 'releases', 'downloads']:
            path = self.root / name
            if path.is_symlink():
                raise RuntimeError('ROOT_SYMLINK_DENIED')
            path.mkdir(exist_ok=True)
        with exclusive_lock(self.root / 'update.lock'):
            return self.update()

    def update(self):
        pointer = self.root / 'state' / 'active.json'
        pending_path = self.root / 'state' / 'pending.json'
        pending = read_json(pending_path)
        if pending:
            # A killed updater may have switched the pointer. Restore the still-running old slot.
            previous = pending.get('old')
            if previous:
                if previous.get('slot') not in ['a', 'b'] or not re.fullmatch('[a-f0-9]{64}', previous.get('sha256', '')):
                    raise RuntimeError('STATE_INVALID')
                atomic_json(pointer, previous)
            else:
                pointer.unlink(missing_ok=True)
            pending_path.unlink()
        old = read_json(pointer)
        if old and (old.get('schemaVersion') != 1 or old.get('slot') not in ['a', 'b'] or not re.fullmatch('[a-f0-9]{64}', old.get('sha256', ''))):
            raise RuntimeError('STATE_INVALID')
        slot = 'b' if old and old['slot'] == 'a' else 'a'
        switched = False
        started = False
        self.status('RUNNING')
        try:
            metadata = self.publisher.latest()
            if old and old.get('md5') == metadata['md5']:
                self.status('UNCHANGED', sha256=old['sha256'])
                return 'UNCHANGED'
            jar = self.root / 'photon-1.3.0.jar'
            if jar.is_symlink() or not jar.is_file() or digest(jar) != self.jar_sha256:
                raise RuntimeError('PINNED_JAR_INVALID')
            if shutil.disk_usage(self.root).free < 12 * 1024**3:
                raise RuntimeError('DISK_BUDGET_INSUFFICIENT')
            if os.name != 'nt':
                meminfo = Path('/proc/meminfo').read_text()
                available = re.search(r'MemAvailable:\s+(\d+) kB', meminfo)
                if not available or int(available[1]) < 3 * 1024**2:
                    raise RuntimeError('MEMORY_BUDGET_INSUFFICIENT')
            archive = self.root / 'downloads' / 'candidate.zst'
            if archive.exists():
                archive.unlink()  # Only our fixed scratch file, never the active index.
            self.publisher.download(metadata, archive)
            if digest(archive, 'md5') != metadata['md5']:
                raise RuntimeError('DATASET_CHECKSUM_MISMATCH')
            sha = digest(archive)
            if old and sha == old['sha256']:
                self.status('UNCHANGED', sha256=sha)
                return 'UNCHANGED'
            release = self.root / 'releases' / sha
            if release.exists():
                marker = read_json(release / 'managed.json')
                if release.is_symlink() or not marker or marker.get('owner') != OWNER or old and sha in [old['sha256'], old.get('previousSha256')]:
                    raise RuntimeError('EXISTING_RELEASE_PRESERVED')
                shutil.rmtree(release)
            release.mkdir()
            atomic_json(release / 'managed.json', {'owner': OWNER, 'sha256': sha})
            os.replace(archive, release / 'source.zst')
            decompress(release / 'source.zst', release / 'source.jsonl')
            self.ops.build(release, jar)
            (release / 'source.jsonl').unlink()
            started = True
            self.ops.start(slot, release, jar)
            self.ops.healthy(slot)
            current = {'schemaVersion': 1, 'slot': slot, 'sha256': sha, 'md5': metadata['md5'], 'source': metadata['url'],
                       'activatedAt': utc_now(), 'previousSha256': old['sha256'] if old else None}
            atomic_json(release / 'manifest.json', current)
            atomic_json(self.root / 'state' / 'pending.json', {'old': old, 'current': current})
            atomic_json(pointer, current)
            switched = True
            self.ops.healthy(slot)
            (self.root / 'state' / 'pending.json').unlink(missing_ok=True)
            switched = False  # Commit: cleanup failures must never stop the healthy active slot.
            started = False
            warning = None
            try:
                if old:
                    self.ops.stop(old['slot'])
                self.prune({sha, current['previousSha256']})
            except Exception:
                warning = 'CLEANUP_PENDING'
            self.status('UPDATED', sha256=sha, previousSha256=current['previousSha256'], cleanupWarning=warning)
            return 'UPDATED'
        except Exception as error:
            if switched:
                if old:
                    atomic_json(pointer, old)
                else:
                    pointer.unlink(missing_ok=True)
            if started:
                try:
                    self.ops.stop(slot)
                except Exception:
                    pass
            (self.root / 'state' / 'pending.json').unlink(missing_ok=True)
            self.status('FAILED', code=str(error) if re.fullmatch('[A-Z_]+', str(error)) else 'UPDATE_FAILED', previousPreserved=True)
            raise

    def prune(self, keep):
        for path in (self.root / 'releases').iterdir():
            if path.name in keep or path.is_symlink() or not path.is_dir() or not re.fullmatch('[a-f0-9]{64}', path.name):
                continue
            marker = read_json(path / 'managed.json')
            if marker and marker.get('owner') == OWNER and marker.get('sha256') == path.name:
                shutil.rmtree(path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='/srv/reloo-maps/photon')
    args = parser.parse_args()
    try:
        print(json.dumps({'outcome': PhotonUpdater(args.root).run(), 'schedule': SCHEDULE}))
    except (BlockingIOError, PermissionError):
        print(json.dumps({'outcome': 'LOCKED_OR_ACCESS_DENIED'}))
        raise SystemExit(1)
    except Exception:
        print(json.dumps({'outcome': 'FAILED', 'previousIndexPreserved': True}))
        raise SystemExit(1)
