# Deepfake Audio Detection — Backend

Standalone FastAPI + PyTorch service for the **Agentic AI for Deepfake Audio
Detection with Explainable AI (XAI)** dashboard. It performs real DSP feature
extraction, runs a spectrogram CNN, produces SHAP/LIME explanations, and hosts
the training dataset.

```
backend/
├── app/
│   ├── main.py            # FastAPI entry point (uvicorn app:app)
│   ├── config.py          # Settings from .env
│   ├── security.py        # Bearer API-key guard
│   ├── schemas.py         # Request/response contracts
│   ├── features.py        # Log-mel, MFCC+Δ, jitter/shimmer, tone, stress…
│   ├── model.py           # SpectroCNN + prosody fusion head
│   ├── xai.py             # SHAP occlusion, LIME surrogate, saliency
│   ├── inference.py       # analyse(): features → model → XAI
│   ├── training.py        # Background training jobs (persisted to jobs.json)
│   ├── storage.py         # Dataset/upload file handling
│   └── routers/           # /health /predict /train /status /dataset/*
├── data/
│   ├── dataset/real/      # ← drop genuine clips here
│   ├── dataset/fake/      # ← drop synthetic clips here
│   ├── uploads/           # transient inference uploads
│   └── jobs.json          # training job history (created at runtime)
├── models/                # trained checkpoints (deepfake_cnn.pt)
├── scripts/
│   ├── train.py           # train without the API server
│   └── import_dataset.py  # bulk-import labelled folders / CSV
├── tests/test_api.py
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # edit MODEL_API_KEY
python -m app.main                                   # serves http://localhost:8000
```

Open http://localhost:8000/docs for the interactive API reference.

## Endpoints

| Method | Path                     | Purpose                                   |
| ------ | ------------------------ | ----------------------------------------- |
| GET    | `/health`                | Model/dataset status                      |
| POST   | `/predict`               | JSON `{audio_url | audio_base64}` → verdict + XAI |
| POST   | `/predict/upload`        | Multipart file upload → verdict + XAI     |
| GET    | `/dataset/stats`         | real/fake counts, balance, total seconds  |
| GET    | `/dataset/items`         | list dataset files                        |
| POST   | `/dataset/upload`        | add a labelled clip (`label=real\|fake`)  |
| DELETE | `/dataset/items/{label}/{file}` | remove a clip                     |
| POST   | `/train`                 | start a background training job           |
| GET    | `/status/{job_id}`       | poll a job (matches the dashboard poll)   |
| GET    | `/jobs`                  | all training jobs                         |

## Training

1. Add clips: drop files into `data/dataset/real` and `data/dataset/fake`,
   use `scripts/import_dataset.py`, or label them in the dashboard's
   *Model Training* page (clips are synced over at train time).
2. Start training from the dashboard, or:

   ```bash
   python -m scripts.train --name baseline --epochs 25
   ```

3. The best checkpoint lands in `models/deepfake_cnn.pt` and is picked up by
   `/predict` immediately (cache is invalidated on save).

Until a checkpoint exists, `/predict` answers with a transparent heuristic
scorer so the API is usable on day one; `GET /health` reports
`model_trained: false`.

## Connecting the dashboard

In the app: **Settings → Inference endpoint** = `https://<your-host>/predict`,
**Training endpoint** = `https://<your-host>/train`. Set `MODEL_API_KEY` in
`.env` and add the same value as the `MODEL_API_KEY` secret in the Lovable app
— the app sends it as `Authorization: Bearer …`.

## Docker

```bash
cd backend
docker compose up --build
```

Dataset and checkpoints are volume-mounted to `./data` and `./models`.

## Wav2Vec2 (optional)

Set `ENABLE_WAV2VEC2=1` in `.env` to compute self-supervised embeddings with
`facebook/wav2vec2-base` alongside the CNN (~360 MB download on first run).

## Tests

```bash
cd backend
pytest
```
