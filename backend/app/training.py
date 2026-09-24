"""Background training job manager for the spectrogram CNN.

Jobs run in a worker thread so the API stays responsive; state is kept in a
JSON file so status survives a restart. Swap `_JOBS` for Redis/Celery when you
move to a multi-worker deployment.
"""

from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import threading
import uuid

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset, WeightedRandomSampler

from . import model as model_mod
from . import storage
from .config import settings
from .features import extract, fixed_mel

JOBS_FILE = Path(settings.path(settings.data_dir)) / "jobs.json"
CACHE_FILE = Path(settings.path(settings.data_dir)) / "features_cache.pt"
_LOCK = threading.Lock()
_ACTIVE_THREADS: set[str] = set()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_all() -> dict[str, dict]:
    if not JOBS_FILE.exists():
        return {}
    try:
        data = json.loads(JOBS_FILE.read_text())
        changed = False
        for job_id, job in data.items():
            if job.get("status") == "running" and job_id not in _ACTIVE_THREADS:
                job["status"] = "failed"
                job["message"] = "Process interrupted or restarted before completion."
                job["completed_at"] = job.get("completed_at") or _now()
                changed = True
        if changed:
            JOBS_FILE.write_text(json.dumps(data, indent=2))
        return data
    except (json.JSONDecodeError, OSError):
        return {}


def _write(job: dict) -> None:
    with _LOCK:
        jobs = _read_all()
        jobs[job["job_id"]] = job
        JOBS_FILE.parent.mkdir(parents=True, exist_ok=True)
        JOBS_FILE.write_text(json.dumps(jobs, indent=2))


def get_job(job_id: str) -> dict | None:
    return _read_all().get(job_id)


def list_jobs() -> list[dict]:
    return sorted(_read_all().values(), key=lambda j: j.get("started_at") or "", reverse=True)


def _collect_local_dataset() -> list[tuple[Path, int]]:
    items: list[tuple[Path, int]] = []
    for label, y in (("real", 0), ("fake", 1)):
        items.extend((p, y) for p in storage.list_dataset(label))
    return items


def _extract_worker(item: tuple[Path, int]) -> tuple[np.ndarray, np.ndarray, int] | None:
    path, y = item
    try:
        feats = extract(str(path))
        mel = fixed_mel(feats.mel)
        mel_norm = model_mod.normalize_spectrogram(mel)
        return mel_norm.astype(np.float32), feats.tabular.astype(np.float32), y
    except Exception:
        return None


def _build_tensors(items: list[tuple[Path, int]], progress_cb=None):
    item_keys = [f"{p.name}_{y}" for p, y in items]
    if CACHE_FILE.exists():
        try:
            cache = torch.load(CACHE_FILE, map_location="cpu", weights_only=False)
            if (
                cache.get("keys") == item_keys
                and "mels" in cache
                and "tabs" in cache
                and "labels" in cache
            ):
                return cache["mels"], cache["tabs"], cache["labels"]
        except Exception:
            pass

    mels, tabs, labels = [], [], []
    total = len(items)
    done = 0

    if progress_cb:
        progress_cb(f"Extracting features: 0/{total} (0%)…")

    workers = min(16, max(4, (os.cpu_count() or 4) * 2))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for res in ex.map(_extract_worker, items):
            done += 1
            if res is not None:
                mel_arr, tab_arr, y = res
                mels.append(mel_arr)
                tabs.append(tab_arr)
                labels.append(y)
            if progress_cb and (done % 20 == 0 or done == total):
                progress_cb(f"Extracting features: {done}/{total} ({done * 100 // total}%)…")

    if not mels:
        raise RuntimeError("No readable audio found in the dataset folders.")

    mel_t = torch.from_numpy(np.stack(mels)).float().unsqueeze(1)
    tab_t = torch.from_numpy(np.stack(tabs)).float()
    y_t = torch.tensor(labels).float()

    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        torch.save({"keys": item_keys, "mels": mel_t, "tabs": tab_t, "labels": y_t}, CACHE_FILE)
    except Exception:
        pass

    return mel_t, tab_t, y_t


def _train(job_id: str, name: str, epochs: int, batch_size: int, lr: float, val_split: float):
    _ACTIVE_THREADS.add(job_id)
    job = get_job(job_id) or {}
    job.update({"status": "running", "message": "Extracting features…"})
    _write(job)

    def on_progress(msg: str):
        print(f"[TRAIN] {msg}", flush=True)
        j = get_job(job_id)
        if j:
            j["message"] = msg
            _write(j)

    try:
        items = _collect_local_dataset()
        if len(items) < 4:
            raise RuntimeError(
                "Need at least 4 clips (2 per class) in data/dataset/real and data/dataset/fake."
            )
        mel, tab, y = _build_tensors(items, progress_cb=on_progress)

        # Stratified train/val split
        real_indices = torch.where(y == 0)[0]
        fake_indices = torch.where(y == 1)[0]

        if len(fake_indices) < 2 or len(real_indices) < 2:
            raise RuntimeError("Need at least 2 real and 2 fake clips to train.")

        g = torch.Generator().manual_seed(42)
        real_perm = real_indices[torch.randperm(len(real_indices), generator=g)]
        fake_perm = fake_indices[torch.randperm(len(fake_indices), generator=g)]

        n_val_real = max(1, int(len(real_indices) * val_split))
        n_val_fake = max(1, int(len(fake_indices) * val_split))

        val_idx = torch.cat([real_perm[:n_val_real], fake_perm[:n_val_fake]])
        train_idx = torch.cat([real_perm[n_val_real:], fake_perm[n_val_fake:]])

        # Feature scaling on tabular attributes from train distribution
        train_tab = tab[train_idx]
        tab_mean = train_tab.mean(dim=0)
        tab_std = train_tab.std(dim=0)
        tab_std = torch.where(tab_std < 1e-6, torch.ones_like(tab_std), tab_std)

        tab_norm = (tab - tab_mean) / tab_std

        # Balanced training sampler
        train_y = y[train_idx]
        n_neg = int((train_y == 0).sum())
        n_pos = int((train_y == 1).sum())

        pos_weight = torch.tensor([float(n_neg) / max(1.0, float(n_pos))])
        crit = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

        class_weights = torch.tensor([1.0 / max(1, n_neg), 1.0 / max(1, n_pos)])
        sample_weights = class_weights[train_y.long()]
        sampler = WeightedRandomSampler(
            weights=sample_weights, num_samples=len(train_y), replacement=True
        )

        train_ds = TensorDataset(mel[train_idx], tab_norm[train_idx], train_y)
        loader = DataLoader(train_ds, batch_size=batch_size, sampler=sampler)

        net = model_mod.build()
        opt = torch.optim.AdamW(net.parameters(), lr=lr, weight_decay=1e-4)
        sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)

        history = []
        best_balanced_acc = 0.0
        best_metrics: dict = {}

        for epoch in range(1, epochs + 1):
            net.train()
            total, correct, loss_sum = 0, 0, 0.0
            for bm, bt, by in loader:
                opt.zero_grad()
                logits = net(bm, bt)
                loss = crit(logits, by)
                loss.backward()
                opt.step()
                loss_sum += float(loss.item()) * len(by)
                preds = (torch.sigmoid(logits) > 0.5).float()
                correct += int((preds == by).sum().item())
                total += len(by)
            sched.step()

            net.eval()
            with torch.no_grad():
                vlogits = net(mel[val_idx], tab_norm[val_idx])
                vloss = float(crit(vlogits, y[val_idx]).item())
                vprobs = torch.sigmoid(vlogits)
                vpreds = (vprobs > 0.5).float()
                vy = y[val_idx]

                vacc = float((vpreds == vy).float().mean().item())
                n_val_pos = max(1.0, float((vy == 1).sum().item()))
                n_val_neg = max(1.0, float((vy == 0).sum().item()))
                tpr = float(((vpreds == 1) & (vy == 1)).float().sum().item() / n_val_pos)
                tnr = float(((vpreds == 0) & (vy == 0)).float().sum().item() / n_val_neg)
                balanced_acc = (tpr + tnr) / 2.0

            acc = correct / max(1, total)
            epoch_loss = loss_sum / max(1, total)
            print(
                f"[EPOCH {epoch}/{epochs}] Loss: {epoch_loss:.4f} | Train Acc: {acc:.1%} | Val Bal Acc: {balanced_acc:.1%} (Syn Recall: {tpr:.1%}, Auth Recall: {tnr:.1%})",
                flush=True,
            )

            history.append(
                {
                    "epoch": epoch,
                    "loss": round(epoch_loss, 5),
                    "accuracy": round(acc, 5),
                    "val_loss": round(vloss, 5),
                    "val_accuracy": round(vacc, 5),
                    "balanced_accuracy": round(balanced_acc, 5),
                    "synthetic_recall": round(tpr, 5),
                    "authentic_recall": round(tnr, 5),
                }
            )

            # Save checkpoint when balanced accuracy improves
            if balanced_acc >= best_balanced_acc:
                best_balanced_acc = balanced_acc
                best_metrics = {
                    "val_accuracy": round(vacc, 5),
                    "balanced_accuracy": round(balanced_acc, 5),
                    "synthetic_recall": round(tpr, 5),
                    "authentic_recall": round(tnr, 5),
                    "val_loss": round(vloss, 5),
                }
                model_mod.save(
                    net,
                    {
                        "model_name": f"SpectroCNN ({name})",
                        "trained_at": _now(),
                        "dataset_size": len(y),
                        "val_accuracy": vacc,
                        "balanced_accuracy": balanced_acc,
                        "synthetic_recall": tpr,
                        "authentic_recall": tnr,
                        "tab_mean": tab_mean.tolist(),
                        "tab_std": tab_std.tolist(),
                    },
                )
                model_mod.invalidate_cache()

            job.update(
                {
                    "accuracy": round(acc, 5),
                    "val_accuracy": round(vacc, 5),
                    "loss": round(epoch_loss, 5),
                    "metrics": {"history": history, "best": best_metrics},
                    "message": f"Epoch {epoch}/{epochs} (Bal Acc: {balanced_acc:.1%})",
                }
            )
            _write(job)

        job.update(
            {
                "status": "completed",
                "completed_at": _now(),
                "accuracy": round(acc, 5),
                "val_accuracy": best_metrics.get("val_accuracy", round(vacc, 5)),
                "message": (
                    f"Training complete! Best balanced accuracy {best_balanced_acc:.1%} "
                    f"(Synthetic recall: {best_metrics.get('synthetic_recall', 0):.1%}, "
                    f"Authentic recall: {best_metrics.get('authentic_recall', 0):.1%})."
                ),
            }
        )
        _write(job)

    except Exception as exc:  # noqa: BLE001
        job.update({"status": "failed", "completed_at": _now(), "message": str(exc)})
        _write(job)
    finally:
        _ACTIVE_THREADS.discard(job_id)


def start(
    name: str,
    epochs: int | None = None,
    batch_size: int | None = None,
    learning_rate: float | None = None,
    val_split: float | None = None,
) -> dict:
    job_id = uuid.uuid4().hex
    epochs = epochs or settings.default_epochs
    job = {
        "job_id": job_id,
        "status": "queued",
        "name": name,
        "epochs": epochs,
        "dataset_size": len(_collect_local_dataset()),
        "accuracy": None,
        "val_accuracy": None,
        "loss": None,
        "message": "Queued",
        "metrics": {},
        "started_at": _now(),
        "completed_at": None,
    }
    _write(job)

    threading.Thread(
        target=_train,
        args=(
            job_id,
            name,
            epochs,
            batch_size or settings.batch_size,
            learning_rate or settings.learning_rate,
            val_split or settings.val_split,
        ),
        daemon=True,
    ).start()
    return job
