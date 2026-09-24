import sys
import time
from app import training

if __name__ == "__main__":
    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    print("=" * 60)
    print(f"VeriVox Training Engine: for-norm (6,000 samples, {epochs} epochs)")
    print("=" * 60, flush=True)

    job = training.start(name="for-norm-6000", epochs=epochs, batch_size=32)
    job_id = job["job_id"]
    print(f"[INIT] Job queued with ID: {job_id}", flush=True)

    while True:
        time.sleep(3)
        current = training.get_job(job_id)
        if not current:
            continue
        status = current.get("status")
        msg = current.get("message", "")
        if status in ("completed", "failed"):
            print("\n" + "=" * 60, flush=True)
            print(f"FINAL STATUS: {status.upper()}", flush=True)
            print(f"DETAILS: {msg}", flush=True)
            if status == "completed":
                print(f"Training Accuracy: {current.get('accuracy', 0):.2%}", flush=True)
                print(f"Val Accuracy: {current.get('val_accuracy', 0):.2%}", flush=True)
                print("Model weights successfully saved to backend/models/deepfake_cnn.pt", flush=True)
            print("=" * 60, flush=True)
            break
