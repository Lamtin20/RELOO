"""Explicit offline-model provisioning; never receives or uploads identity images."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
args = parser.parse_args()
pin = json.loads((Path(__file__).resolve().parents[1] / 'tools/vietocr-toolchain.json').read_text())
target = args.directory.resolve()
target.mkdir(parents=True, exist_ok=True)
final = target / 'vgg_seq2seq.pth'
if final.exists():
    with final.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != pin['weightsSha256']:
            raise SystemExit('Existing weights differ. No file was overwritten.')
else:
    partial = target / 'vgg_seq2seq.pth.partial'
    try:
        digest, size = hashlib.sha256(), 0
        with urllib.request.urlopen(pin['weightsUrl'], timeout=60) as response, partial.open('xb') as output:
            if response.geturl() != pin['weightsUrl']:
                raise ValueError('Unexpected model redirect')
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > pin['weightsBytes']:
                    raise ValueError('Model size limit exceeded')
                digest.update(chunk)
                output.write(chunk)
        if size != pin['weightsBytes'] or digest.hexdigest() != pin['weightsSha256']:
            raise ValueError('Model integrity mismatch')
        partial.replace(final)
    except Exception:
        # Leave a failed partial for inspection; never install it as valid weights.
        raise SystemExit('Model provisioning failed. Production configuration unchanged.')
print(json.dumps({'status': 'LOCAL_WEIGHTS_VERIFIED', 'sha256': pin['weightsSha256'], 'commercialRights': pin['weightsRights'], 'productionActivated': False}))
