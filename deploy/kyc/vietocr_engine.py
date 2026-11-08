"""Opt-in CPU line recognizer. Never download models or receive QR claims."""
import hashlib
import json
import math
import os
from pathlib import Path
import re
import time

_reader = None
_failed = False


def status():
    if os.environ.get('RELOO_VIETOCR_ENABLED') != '1':
        return 'DISABLED'
    return 'UNAVAILABLE' if _failed else 'READY' if _reader is not None else 'NOT_LOADED'


def load_reader():
    global _reader, _failed
    if status() == 'DISABLED' or _failed:
        return None
    if _reader is not None:
        return _reader
    try:
        weights = Path('/models/vietocr/vgg_seq2seq.pth')
        digest = os.environ.get('RELOO_VIETOCR_WEIGHTS_SHA256', '')
        if not re.fullmatch(r'[a-f0-9]{64}', digest) or not weights.is_file() or not 0 < weights.stat().st_size <= 256_000_000:
            raise ValueError('MODEL_NOT_PROVISIONED')
        with weights.open('rb') as stream:
            if hashlib.file_digest(stream, 'sha256').hexdigest() != digest:
                raise ValueError('MODEL_CHECKSUM')
        import torch
        from vietocr.tool.translate import build_model, process_input, translate
        config = json.loads(Path('/service/vietocr-vgg-seq2seq.json').read_text(encoding='utf-8'))
        config['device'] = 'cpu'
        config['cnn']['pretrained'] = False
        torch.set_num_threads(2)
        model, vocab = build_model(config)
        model.load_state_dict(torch.load(weights, map_location='cpu', weights_only=True), strict=True)
        model.eval()

        def predict(image):
            tensor = process_input(image, 32, 32, 512).to('cpu')
            with torch.inference_mode():
                output, probability = translate(tensor, model, max_seq_length=100)
            return vocab.decode(output[0].tolist()), float(probability[0])
        _reader = predict
    except Exception:
        # Model paths, card text, credentials and upstream exception content are private.
        _failed = True
    return _reader


def recognize_rows(picture, rotation, rows, reader=None, deadline=None, right=True):
    reader = reader or load_reader()
    if reader is None:
        return [], status()
    image = picture.rotate(rotation, expand=True)
    if right and image.width > image.height:
        image = image.crop((round(image.width * .28), 0, image.width, image.height))
    image.thumbnail((2600, 2600))
    deadline = deadline or time.monotonic() + 12
    result = []
    for row in rows[:16]:
        if time.monotonic() >= deadline:
            return result, 'PARTIAL'
        try:
            left, top, height = int(row['left']), int(row['top']), int(row['height'])
            right = max(int(w['left']) + int(w['width']) for w in row.get('words', []))
            if height < 5 or right <= left or left < 0 or top < 0 or right > image.width or top + height > image.height:
                continue
            padding = max(2, round(height * .1))
            crop = image.crop((max(0, left-padding), max(0, top-padding), min(image.width, right+padding), min(image.height, top+height+padding)))
            text, probability = reader(crop)
            if not isinstance(text, str) or not 0 < len(text.strip()) <= 180 or not math.isfinite(probability) or not 0 <= probability <= 1 or re.search(r'[\x00-\x1f]', text):
                continue
            result.append({**row, 'text': text.strip(), 'words': [], 'confidence': probability * 100})
        except Exception:
            return result, 'UNAVAILABLE'
    return result, 'PROCESSED' if result else 'NO_TEXT_REGIONS'
