"""Train the detector from the command line without starting the API.

Usage:
    python -m scripts.train --name baseline --epochs 25
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import training  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the deepfake-audio CNN")
    parser.add_argument("--name", default="cli-run")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--lr", type=float, default=None)
    args = parser.parse_args()

    job = training.start(args.name, epochs=args.epochs, batch_size=args.batch_size,
                         learning_rate=args.lr)
    print(f"job {job['job_id']} started on {job['dataset_size']} clips")

    while True:
        time.sleep(2)
        current = training.get_job(job["job_id"]) or {}
        status = current.get("status")
        print(f"[{status}] {current.get('message', '')}", end="\r")
        if status in {"completed", "failed", "cancelled"}:
            print()
            print(f"accuracy={current.get('accuracy')} val_accuracy={current.get('val_accuracy')}")
            break


if __name__ == "__main__":
    main()
