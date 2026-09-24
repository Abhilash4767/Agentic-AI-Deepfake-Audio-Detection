FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        libsndfile1 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

COPY requirements.txt .
# CPU-only torch keeps the image small; swap the index URL for GPU builds.
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch==2.5.1 torchaudio==2.5.1 \
 && pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "-m", "app.main"]
