import io
import os
import re
import secrets
import threading
import numpy as np
import pytesseract
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
import json
from PIL import Image, ImageOps

app = FastAPI()
lock = threading.Lock()
Image.MAX_IMAGE_PIXELS = 16_000_000

@app.post('/live-video')
async def live_video(video: UploadFile = File(...), selfie: UploadFile = File(...), poses: str = Form(...), x_kyc_token: str = Header(None)):
    authorize(x_kyc_token)
    if not lock.acquire(blocking=False):
        raise HTTPException(429, 'Another identity job is running')
    try:
        data = await video.read(8_000_001)
        if len(data) > 8_000_000:
            raise HTTPException(413, 'Video too large')
        reference = np.array(await image(selfie))[:, :, ::-1]
        from live_video import validate_video
        return validate_video(data, reference, json.loads(poses))
    finally:
        lock.release()

def authorize(token):
    expected = os.environ.get("KYC_SERVICE_TOKEN", "")
    if not expected or not token or not secrets.compare_digest(token, expected):
        raise HTTPException(401, "Unauthorized")

async def image(file):
    data = await file.read(2_000_001)
    if len(data) > 2_000_000:
        raise HTTPException(413, "Image too large")
    try:
        picture = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        picture.load()
        return picture
    except Exception:
        raise HTTPException(400, "Invalid image")

@app.get("/health")
def health():
    from vietocr_engine import status
    return {"service": "reloo-local-kyc", "ocr": "tesseract", "vietocr": status(), "face": "deepface"}

@app.post("/analyze")
async def analyze(front: UploadFile = File(...), back: UploadFile = File(...), selfie: UploadFile = File(...), x_kyc_token: str = Header(None)):
    authorize(x_kyc_token)
    if not lock.acquire(blocking=False):
        raise HTTPException(429, "Another identity job is running")
    try:
        front_image, back_image, selfie_image = await image(front), await image(back), await image(selfie)
        text = pytesseract.image_to_string(front_image, lang="vie+eng", config="--psm 6") + "\n" + pytesseract.image_to_string(back_image, lang="vie+eng", config="--psm 6")
        numbers = list(dict.fromkeys(re.findall(r"(?<!\d)\d{12}(?!\d)", text)))
        dates = list(dict.fromkeys(re.findall(r"\b\d{2}[/.-]\d{2}[/.-]\d{4}\b", text)))
        patterns = {
            "fullName": r"(?:Họ\s*(?:và)?\s*tên|Full name)\s*[:/]?\s*(?:Full name\s*[:/]?\s*)?([^\n]{3,100})",
            "dateOfBirth": r"(?:Ngày\s*sinh|Date of birth)[^\n\d]{0,30}(\d{2}[/.-]\d{2}[/.-]\d{4})",
            "sex": r"(?:Giới\s*tính|Sex)[^\n:]{0,15}[:]?\s*(Nam|Nữ|Male|Female)",
            "nationality": r"(?:Quốc\s*tịch|Nationality)\s*[:/]?\s*(?:Nationality\s*[:/]?\s*)?([^\n]{2,80})",
            "residence": r"(?:Nơi\s*thường\s*trú|Nơi\s*cư\s*trú|Place of residence)\s*[:/]?\s*(?:Place of residence\s*[:/]?\s*)?([^\n]{3,200})",
            "expiryDate": r"(?:Có giá trị đến|Date of expiry)[^\n\d]{0,30}(\d{2}[/.-]\d{2}[/.-]\d{4})",
        }
        fields = {}
        for name, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            fields[name] = match.group(1).strip() if match else None
        result = {"ocr": {"text": text[:12000], "nationalIds": numbers, "dates": dates, "fields": fields, "fieldsRequireConfirmation": True}, "face": {"status": "UNAVAILABLE"}, "requiresHumanReview": True}
        try:
            from deepface import DeepFace
            front_bgr = np.array(front_image)[:, :, ::-1]
            selfie_bgr = np.array(selfie_image)[:, :, ::-1]
            if len(DeepFace.extract_faces(front_bgr, detector_backend="opencv", enforce_detection=True)) != 1 or len(DeepFace.extract_faces(selfie_bgr, detector_backend="opencv", enforce_detection=True)) != 1:
                result["face"] = {"status": "REVIEW", "reason": "Exactly one face is required in each image"}
            else:
                match = DeepFace.verify(front_bgr, selfie_bgr, model_name="SFace", detector_backend="opencv", distance_metric="cosine", enforce_detection=True)
                result["face"] = {"status": "PROCESSED", "verified": bool(match["verified"]), "distance": float(match["distance"]), "threshold": float(match["threshold"]), "model": "SFace", "metric": "cosine", "liveness": "NOT_ESTABLISHED"}
        except Exception:
            result["face"] = {"status": "UNAVAILABLE", "reason": "Face engine or model not ready"}
        return result
    finally:
        lock.release()

@app.post('/ocr')
async def ocr(front: UploadFile = File(...), back: UploadFile = File(...), x_kyc_token: str = Header(None)):
    authorize(x_kyc_token)
    if not lock.acquire(blocking=False):
        raise HTTPException(429, 'Another identity job is running')
    try:
        from document_ocr import read_card_pair
        return read_card_pair(await image(front), await image(back))
    finally:
        lock.release()
