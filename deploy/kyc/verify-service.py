import io
import json
from PIL import Image, ImageDraw
import pytesseract
from deepface import DeepFace

# Public DeepFace test images and an explicitly synthetic OCR fixture.
positive = DeepFace.verify('/tmp/reloo-face-1.jpg', '/tmp/reloo-face-1.jpg', model_name='SFace', detector_backend='opencv', enforce_detection=True)
negative = DeepFace.verify('/tmp/reloo-face-1.jpg', '/tmp/reloo-face-3.jpg', model_name='SFace', detector_backend='opencv', enforce_detection=True)
image = Image.new('RGB', (900, 180), 'white')
ImageDraw.Draw(image).text((30, 30), 'RELOO TEST ONLY 012345678901', fill='black', font_size=40)
ocr = pytesseract.image_to_string(image, lang='vie+eng', config='--psm 6')
assert positive['verified'] is True
assert negative['verified'] is False
assert '012345678901' in ocr
print(json.dumps({'sameFaceVerified': True, 'differentFaceRejected': True, 'syntheticNumberRead': True, 'model': 'SFace', 'livenessEstablished': False}))
