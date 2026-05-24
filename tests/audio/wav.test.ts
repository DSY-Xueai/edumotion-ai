import { describe, expect, it } from "vitest";
import { readWavInfo, trimSilenceFromWav } from "../../src/lib/audio/wav";

const createToneWav = ({
  leadSilenceMs = 0,
  toneMs = 500,
  trailSilenceMs = 0,
}: {
  leadSilenceMs?: number;
  toneMs?: number;
  trailSilenceMs?: number;
}) => {
  const sampleRate = 16000;
  const bytesPerSample = 2;
  const sampleCount = Math.max(
    1,
    Math.round(((leadSilenceMs + toneMs + trailSilenceMs) / 1000) * sampleRate),
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
    const withinTone = sampleIndex >= (leadSilenceMs / 1000) * sampleRate &&
      sampleIndex < ((leadSilenceMs + toneMs) / 1000) * sampleRate;
    const amplitude = withinTone
      ? Math.round(Math.sin((2 * Math.PI * 220 * sampleIndex) / sampleRate) * 9000)
      : 0;

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
