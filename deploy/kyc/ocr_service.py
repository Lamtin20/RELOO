"""Private OCR-only entry point; existing face/liveness service stays separate."""
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from service import authorize, image, lock
from vietocr_engine import status

app = FastAPI()


@app.get('/health')
def health():
    return {'service': 'reloo-identity-ocr', 'tesseract': True, 'vietocr': status()}


@app.post('/ocr')
async def ocr(front: UploadFile = File(...), back: UploadFile = File(...), x_kyc_token: str = Header(None)):
    authorize(x_kyc_token)
    if not lock.acquire(blocking=False):
        raise HTTPException(429, 'Identity reader busy')
    try:
        from document_ocr import read_card_pair
        return read_card_pair(await image(front), await image(back))
    finally:
        lock.release()
