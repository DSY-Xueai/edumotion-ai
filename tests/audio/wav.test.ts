import { describe, expect, it } from "vitest";
import {
  compressInternalSilenceFromWav,
  readWavInfo,
  trimSilenceFromWav,
} from "../../src/lib/audio/wav";

const createToneWav = ({
  leadSilenceMs = 0,
  toneMs = 500,
  internalSilenceMs = 0,
  secondToneMs = 0,
  trailSilenceMs = 0,
  silenceAmplitude = 0,
}: {
  leadSilenceMs?: number;
  toneMs?: number;
  internalSilenceMs?: number;
  secondToneMs?: number;
  trailSilenceMs?: number;
  silenceAmplitude?: number;
}) => {
  const sampleRate = 16000;
  const bytesPerSample = 2;
  const totalDurationMs =
    leadSilenceMs + toneMs + internalSilenceMs + secondToneMs + trailSilenceMs;
  const sampleCount = Math.max(
    1,
    Math.round((totalDurationMs / 1000) * sampleRate),
  );
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset, value.charCodeAt(index));
      offset += 1;
    }
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * bytesPerSample, true);
  offset += 4;
  view.setUint16(offset, bytesPerSample, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const timeMs = (sampleIndex / sampleRate) * 1000;
    const withinFirstTone =
      timeMs >= leadSilenceMs && timeMs < leadSilenceMs + toneMs;
    const secondToneStartMs = leadSilenceMs + toneMs + internalSilenceMs;
    const withinSecondTone =
      timeMs >= secondToneStartMs && timeMs < secondToneStartMs + secondToneMs;
    const withinTone = withinFirstTone || withinSecondTone;
    const amplitude = withinTone
      ? Math.round(Math.sin((2 * Math.PI * 220 * sampleIndex) / sampleRate) * 9000)
      : silenceAmplitude;

    view.setInt16(offset, amplitude, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
};

describe("trimSilenceFromWav", () => {
  it("trims long silence from the start and end of a wav segment", () => {
    const source = createToneWav({ leadSilenceMs: 1000, toneMs: 500, trailSilenceMs: 800 });
    const trimmed = trimSilenceFromWav(source);

    expect(trimmed.trimmed).toBe(true);
    expect(trimmed.trimStartMs).toBeGreaterThanOrEqual(900);
    expect(trimmed.trimStartMs).toBeLessThanOrEqual(1100);
    expect(trimmed.durationMs).toBeLessThan(700);
    expect(trimmed.durationMs).toBeGreaterThan(450);
    expect(readWavInfo(trimmed.bytes).durationMs).toBe(trimmed.durationMs);
  });
});

describe("compressInternalSilenceFromWav", () => {
  it("shortens long silence between spoken parts while preserving speech", () => {
    const source = createToneWav({
      toneMs: 400,
      internalSilenceMs: 800,
      secondToneMs: 400,
    });
    const compressed = compressInternalSilenceFromWav(source, {
      threshold: 320,
      minSilenceMs: 250,
      keepSilenceMs: 140,
    });

    expect(compressed.compressed).toBe(true);
    expect(compressed.removedMs).toBeGreaterThanOrEqual(600);
    expect(compressed.durationMs).toBeGreaterThanOrEqual(900);
    expect(compressed.durationMs).toBeLessThanOrEqual(1000);
    expect(readWavInfo(compressed.bytes).durationMs).toBe(compressed.durationMs);
  });

  it("treats low noise pauses as silence by default", () => {
    const source = createToneWav({
      toneMs: 400,
      internalSilenceMs: 800,
      secondToneMs: 400,
      silenceAmplitude: 600,
    });
    const compressed = compressInternalSilenceFromWav(source);

    expect(compressed.compressed).toBe(true);
    expect(compressed.durationMs).toBeLessThan(1100);
  });

  it("shortens small waits that are still noticeable in narration", () => {
    const source = createToneWav({
      toneMs: 400,
      internalSilenceMs: 210,
      secondToneMs: 400,
      silenceAmplitude: 600,
    });
    const compressed = compressInternalSilenceFromWav(source);

    expect(compressed.compressed).toBe(true);
    expect(compressed.durationMs).toBeLessThanOrEqual(910);
  });
});
