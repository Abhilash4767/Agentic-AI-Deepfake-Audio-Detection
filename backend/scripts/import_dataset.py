"""Bulk-import an ASVspoof-style or folder-based dataset into data/dataset.

Expects a source folder structured as either
    source/real/*.wav
    source/fake/*.wav
or a flat folder plus a metadata CSV with columns: file,label   (label = real|fake)

Usage:
    python -m scripts.import_dataset /path/to/source
    python -m scripts.import_dataset /path/to/source --metadata meta.csv
"""

from __future__ import annotations

import argparse
import csv
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import storage  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Import labelled audio into data/dataset")
    parser.add_argument("source", type=Path)
    parser.add_argument("--metadata", type=Path, default=None)
    args = parser.parse_args()

    if not args.source.is_dir():
        raise SystemExit(f"Not a directory: {args.source}")

    copied = 0
    if args.metadata:
        with args.metadata.open() as fh:
            for row in csv.DictReader(fh):
                label = (row.get("label") or "").strip().lower()
                if label not in {"real", "fake"}:
                    continue
                src = args.source / (row.get("file") or "")
                if not src.exists():
                    continue
                shutil.copy2(src, storage.save_dataset_file(label, src.name, src.read_bytes()))
                copied += 1
    else:
        for label in ("real", "fake"):
            src_dir = args.source / label
            if not src_dir.is_dir():
                continue
            for p in src_dir.iterdir():
                if p.suffix.lower() in storage.AUDIO_SUFFIXES:
                    storage.save_dataset_file(label, p.name, p.read_bytes())
                    copied += 1

    print(f"Imported {copied} file(s).")
    print(f"  real: {len(storage.list_dataset('real'))}")
    print(f"  fake: {len(storage.list_dataset('fake'))}")


if __name__ == "__main__":
    main()
