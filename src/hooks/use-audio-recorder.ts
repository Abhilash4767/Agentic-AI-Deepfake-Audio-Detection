import { useState, useRef, useCallback, useEffect } from "react";
import { audioBufferToWav } from "@/lib/audio-recorder";

export interface AudioRecorderState {
  isRecording: boolean;
  duration: number; // in seconds
  audioFile: File | null;
  audioUrl: string | null;
  volume: number; // 0 to 1
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    duration: 0,
    audioFile: null,
    audioUrl: null,
    volume: 0,
    error: null,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Real-time audio analyzer loop for volume & waveform
  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Compute average volume level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    const normalized = Math.min(1, Math.max(0, avg / 128));

    setState((prev) => (prev.isRecording ? { ...prev, volume: normalized } : prev));
    animFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Clear previous recording state
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      setState({
        isRecording: false,
        duration: 0,
        audioFile: null,
        audioUrl: null,
        volume: 0,
        error: null,
      });

      // Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Set up Web Audio API AudioContext & AnalyserNode
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;

      // Start duration counter
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        setState((prev) => ({ ...prev, duration: elapsedSec }));
      }, 500);

      setState((prev) => ({ ...prev, isRecording: true, error: null }));
      animFrameRef.current = requestAnimationFrame(updateVolume);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone permissions in your browser."
          : err instanceof Error
            ? err.message
            : "Failed to access microphone.";
      setState((prev) => ({ ...prev, error: msg, isRecording: false }));
    }
  }, [state.audioUrl, updateVolume]);

  const stopRecording = useCallback(async (): Promise<File | null> => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return null;
    }

    return new Promise<File | null>((resolve) => {
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = async () => {
        // Stop timer & animation frame
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        // Stop all audio tracks to release microphone hardware
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        try {
          const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType });
          const arrayBuffer = await rawBlob.arrayBuffer();

          // Decode raw audio using AudioContext to extract PCM audio buffer
          const audioCtx = audioContextRef.current || new AudioContext();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);

          // Convert into pristine 16kHz mono 16-bit PCM WAV
          const wavBlob = audioBufferToWav(decoded, 16000);
          const fileName = `live_voice_${new Date().toISOString().replace(/[:.]/g, "-")}.wav`;
          const file = new File([wavBlob], fileName, { type: "audio/wav" });
          const url = URL.createObjectURL(wavBlob);

          if (audioCtx.state !== "closed") {
            await audioCtx.close();
          }

          setState((prev) => ({
            ...prev,
            isRecording: false,
            audioFile: file,
            audioUrl: url,
            volume: 0,
          }));

          resolve(file);
        } catch (err) {
          console.error("Error processing recorded audio to WAV:", err);
          // Fallback to raw recorded blob as File if decode fails
          const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType });
          const ext = recorder.mimeType.includes("ogg") ? "ogg" : "webm";
          const fallbackFile = new File([rawBlob], `live_voice_${Date.now()}.${ext}`, {
            type: recorder.mimeType,
          });
          const url = URL.createObjectURL(rawBlob);

          setState((prev) => ({
            ...prev,
            isRecording: false,
            audioFile: fallbackFile,
            audioUrl: url,
            volume: 0,
          }));

          resolve(fallbackFile);
        }
      };

      recorder.stop();
    });
  }, []);

  const resetRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    setState({
      isRecording: false,
      duration: 0,
      audioFile: null,
      audioUrl: null,
      volume: 0,
      error: null,
    });
  }, [state.audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    ...state,
    analyserNode: analyserRef.current,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
