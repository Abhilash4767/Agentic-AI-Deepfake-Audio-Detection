// Web Audio API recording and standard PCM WAV encoder
// Captures live microphone input, downsamples/formats to 16-bit PCM mono WAV,
// perfectly compatible with librosa, soundfile, and browser audio elements.

export function audioBufferToWav(buffer: AudioBuffer, targetSampleRate = 16000): Blob {
  const numChannels = 1; // mono for speech ML models
  const sourceSampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);

  // Resample if necessary to targetSampleRate (default 16kHz for speech models)
  let samples: Float32Array;
  if (sourceSampleRate !== targetSampleRate) {
    const ratio = sourceSampleRate / targetSampleRate;
    const newLength = Math.round(channelData.length / ratio);
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIdx = i * ratio;
      const base = Math.floor(srcIdx);
      const next = Math.min(base + 1, channelData.length - 1);
      const frac = srcIdx - base;
      samples[i] = channelData[base] * (1 - frac) + channelData[next] * frac;
    }
  } else {
    samples = channelData;
  }

  const sampleRate = targetSampleRate;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Write RIFF chunk header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // Write fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample (16)

  // Write data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples (clamped -1.0 to 1.0 -> 16-bit signed integer)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
