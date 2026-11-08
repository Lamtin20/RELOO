FROM python:3.11-slim-bookworm
WORKDIR /service
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-vie libgl1 libglib2.0-0 libportaudio2 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir torch==2.8.0 torchvision==0.23.0 --index-url https://download.pytorch.org/whl/cpu
RUN mkdir -p models && python -c "import urllib.request; urllib.request.urlretrieve('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task','models/face_landmarker.task')"
ARG INSTALL_VIETOCR=0
COPY requirements-vietocr.txt ./
RUN if [ "$INSTALL_VIETOCR" = "1" ]; then pip install --no-cache-dir -r requirements-vietocr.txt && pip install --no-cache-dir --no-deps 'https://github.com/pbcquoc/vietocr/archive/fe8c3a7fc714aec57ab81cec844eb3adf0c1636c.tar.gz'; fi
COPY service.py live_video.py document_ocr.py vietocr_engine.py vietocr-vgg-seq2seq.json ./
COPY licenses/ ./licenses/
ENV TF_CPP_MIN_LOG_LEVEL=3 CUDA_VISIBLE_DEVICES=-1 TF_NUM_INTRAOP_THREADS=2 TF_NUM_INTEROP_THREADS=2
CMD ["uvicorn", "service:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
