import { useEffect, useRef } from "react";
import { Mic, Square, RotateCcw, Play, AlertCircle, Volume2, Sparkles } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";

interface LiveRecorderProps {
  onAnalyze: (file: File) => void;
  disabled?: boolean;
}

export function LiveRecorder({ onAnalyze, disabled }: LiveRecorderProps) {
  const {
    isRecording,
    duration,
    audioFile,
    audioUrl,
    volume,
    error,
    analyserNode,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Oscilloscope canvas animation loop while recording
  useEffect(() => {
    if (!isRecording || !analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyserNode.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgba(10, 15, 20, 0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "rgb(34, 211, 238)"; // neon cyan matching VeriVox accent
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isRecording, analyserNode]);

  const handleStopAndAnalyze = async () => {
    const file = await stopRecording();
    if (file) {
      onAnalyze(file);
    }
  };

  const handleSendRecorded = () => {
    if (audioFile) {
      onAnalyze(audioFile);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-lg border border-border bg-background/50 p-5 backdrop-blur-sm">
      {/* Error state */}
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Microphone Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Recording State */}
      {isRecording ? (
        <div className="flex flex-col items-center py-2 text-center">
          <div className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/15 px-3 py-1 text-xs font-medium text-destructive">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive"></span>
            </span>
            Live Recording · {formatTime(duration)}
          </div>

          {/* Web Audio Oscilloscope Canvas */}
          <div className="mt-4 w-full overflow-hidden rounded-md border border-cyan-500/30 bg-slate-950/80 shadow-inner">
            <canvas
              ref={canvasRef}
              width={560}
              height={100}
              className="h-24 w-full"
            />
          </div>

          {/* Live Voice Volume Meter */}
          <div className="mt-3 flex w-full max-w-xs items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75"
                style={{ width: `${Math.min(100, Math.round(volume * 100))}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {Math.round(volume * 100)}%
            </span>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Speak naturally. We capture speech features (F0 pitch, jitter, spectral formants).
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleStopAndAnalyze}
              disabled={disabled}
              className="flex items-center gap-2 rounded-md bg-destructive px-5 py-2.5 text-xs font-semibold text-destructive-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <Square className="h-3.5 w-3.5 fill-current" /> Stop & Run Analysis
            </button>
            <button
              type="button"
              onClick={() => stopRecording()}
              className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Stop & Preview
            </button>
          </div>
        </div>
      ) : audioFile && audioUrl ? (
        /* Review Recorded Audio State */
        <div className="flex flex-col items-center py-2 text-center">
          <div className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <Sparkles className="h-3 w-3" /> Voice sample captured ({formatTime(duration)})
          </div>

          <div className="mt-4 flex w-full max-w-md items-center justify-center">
            <audio controls src={audioUrl} className="h-9 w-full" />
          </div>

          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            {audioFile.name} · {Math.max(1, Math.round(audioFile.size / 1024))} KB · 16 kHz PCM WAV
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleSendRecorded}
              disabled={disabled}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Run Deepfake Pipeline
            </button>
            <button
              type="button"
              onClick={resetRecording}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Record Again
            </button>
          </div>
        </div>
      ) : (
        /* Idle / Ready to Record State */
        <div className="flex flex-col items-center py-6 text-center">
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-primary transition-all hover:scale-105 hover:border-primary hover:bg-primary/20 active:scale-95 disabled:opacity-50"
          >
            <Mic className="h-7 w-7 transition-transform group-hover:scale-110" />
            <span className="absolute -inset-1 rounded-full border border-primary/20 animate-pulse" />
          </button>

          <p className="mt-4 text-sm font-semibold">Click to Record Live Voice</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Direct microphone stream via Web Audio API. Speak into your mic for 3–10 seconds to run immediate on-the-fly verification.
          </p>

          <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            16 kHz mono · In-browser PCM encoding · Private & secure
          </div>
        </div>
      )}
    </div>
  );
}
