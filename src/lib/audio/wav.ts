type WavInfo = {
  sampleRate: number;
  channelCount: number;
  bitsPerSample: number;
  blockAlign: number;
  dataOffset: number;
  dataSize: number;
  durationMs: number;
};

type TrimmedWav = {
  bytes: Uint8Array<ArrayBuffer>;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  trimmed: boolean;
};

type CompressedWav = {
  bytes: Uint8Array<ArrayBuffer>;
  durationMs: number;
  removedMs: number;
  compressed: boolean;
};

const readAscii = (view: DataView, offset: number, length: number) => {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }

  return value;
};

const writeAscii = (
  view: DataView,
  offset: number,
  value: string,
) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

const writeWavHeader = (info: WavInfo, dataSize: number) => {
  const output = new Uint8Array(new ArrayBuffer(44 + dataSize));
  const view = new DataView(output.buffer);
  let offset = 0;

  writeAscii(view, offset, "RIFF");
  offset += 4;
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeAscii(view, offset, "WAVE");
  offset += 4;
  writeAscii(view, offset, "fmt ");
  offset += 4;
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, info.channelCount, true);
  offset += 2;
  view.setUint32(offset, info.sampleRate, true);
  offset += 4;
  view.setUint32(offset, info.sampleRate * info.blockAlign, true);
  offset += 4;
  view.setUint16(offset, info.blockAlign, true);
  offset += 2;
  view.setUint16(offset, info.bitsPerSample, true);
  offset += 2;
  writeAscii(view, offset, "data");
  offset += 4;
  view.setUint32(offset, dataSize, true);

  return output;
};

export const readWavInfo = (bytes: Uint8Array): WavInfo => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (
    bytes.byteLength < 44 ||
    readAscii(view, 0, 4) !== "RIFF" ||
    readAscii(view, 8, 4) !== "WAVE"
  ) {
    throw new Error("Expected a RIFF/WAVE audio response from Qwen TTS.");
  }

  let offset = 12;
  let sampleRate: number | undefined;
  let channelCount: number | undefined;
  let bitsPerSample: number | undefined;
  let blockAlign: number | undefined;
  let dataOffset: number | undefined;
  let dataSize: number | undefined;

  while (offset + 8 <= bytes.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;

    if (chunkDataOffset + chunkSize > bytes.byteLength) {
      throw new Error("Invalid WAV chunk size.");
    }

    if (chunkId === "fmt ") {
      channelCount = view.getUint16(chunkDataOffset + 2, true);
      sampleRate = view.getUint32(chunkDataOffset + 4, true);
      blockAlign = view.getUint16(chunkDataOffset + 12, true);
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true);
    }

    if (chunkId === "data") {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (
    !sampleRate ||
    !channelCount ||
    !bitsPerSample ||
    !blockAlign ||
    dataOffset === undefined ||
    dataSize === undefined
  ) {
    throw new Error("WAV response is missing fmt or data chunks.");
  }

  return {
    sampleRate,
    channelCount,
    bitsPerSample,
    blockAlign,
    dataOffset,
    dataSize,
    durationMs: Math.round((dataSize / blockAlign / sampleRate) * 1000),
  };
};

export const concatenateWavFiles = (
  files: Uint8Array<ArrayBuffer>[],
): Uint8Array<ArrayBuffer> => {
  if (files.length === 0) {
    throw new Error("Cannot concatenate an empty WAV file list.");
  }

  const parsed = files.map((bytes) => ({
    bytes,
    info: readWavInfo(bytes),
  }));
  const first = parsed[0]?.info;

  if (!first) {
    throw new Error("Cannot read first WAV file.");
  }

  for (const { info } of parsed) {
    if (
      info.sampleRate !== first.sampleRate ||
      info.channelCount !== first.channelCount ||
      info.bitsPerSample !== first.bitsPerSample ||
      info.blockAlign !== first.blockAlign
    ) {
      throw new Error("Cannot concatenate WAV files with different formats.");
    }
  }

  const dataSize = parsed.reduce((total, { info }) => total + info.dataSize, 0);
  const output = writeWavHeader(first, dataSize);
  let offset = 44;

  for (const { bytes, info } of parsed) {
    output.set(
      bytes.slice(info.dataOffset, info.dataOffset + info.dataSize),
      offset,
    );
    offset += info.dataSize;
  }

  return output;
};

export const trimSilenceFromWav = (
  bytes: Uint8Array<ArrayBuffer>,
  {
    threshold = 320,
    paddingMs = 80,
  }: {
    threshold?: number;
    paddingMs?: number;
  } = {},
): TrimmedWav => {
  const info = readWavInfo(bytes);

  if (info.bitsPerSample !== 16) {
    return {
      bytes,
      durationMs: info.durationMs,
      trimStartMs: 0,
      trimEndMs: 0,
      trimmed: false,
    };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frameCount = Math.floor(info.dataSize / info.blockAlign);
  const padFrames = Math.round((paddingMs / 1000) * info.sampleRate);

  const isFrameSilent = (frameIndex: number) => {
    const frameOffset = info.dataOffset + frameIndex * info.blockAlign;

    for (let channelIndex = 0; channelIndex < info.channelCount; channelIndex += 1) {
      const sampleOffset = frameOffset + channelIndex * 2;
      const sample = view.getInt16(sampleOffset, true);

      if (Math.abs(sample) > threshold) {
        return false;
      }
    }

    return true;
  };

  let startFrame = 0;
  while (startFrame < frameCount && isFrameSilent(startFrame)) {
    startFrame += 1;
  }

  if (startFrame >= frameCount) {
    return {
      bytes,
      durationMs: info.durationMs,
      trimStartMs: 0,
      trimEndMs: 0,
      trimmed: false,
    };
  }

  let endFrame = frameCount - 1;
  while (endFrame >= startFrame && isFrameSilent(endFrame)) {
    endFrame -= 1;
  }

  const trimmedStartFrame = Math.max(0, startFrame - padFrames);
  const trimmedEndFrame = Math.min(frameCount, endFrame + 1 + padFrames);

  if (trimmedStartFrame === 0 && trimmedEndFrame === frameCount) {
    return {
      bytes,
      durationMs: info.durationMs,
      trimStartMs: 0,
      trimEndMs: 0,
      trimmed: false,
    };
  }

  const dataOffset = info.dataOffset + trimmedStartFrame * info.blockAlign;
  const dataSize = (trimmedEndFrame - trimmedStartFrame) * info.blockAlign;
  const output = writeWavHeader(info, dataSize);
  output.set(bytes.slice(dataOffset, dataOffset + dataSize), 44);

  const trimStartMs = Math.round((trimmedStartFrame / info.sampleRate) * 1000);
  const trimEndMs = Math.round(((frameCount - trimmedEndFrame) / info.sampleRate) * 1000);

  return {
    bytes: output,
    durationMs: Math.round((dataSize / info.blockAlign / info.sampleRate) * 1000),
    trimStartMs,
    trimEndMs,
    trimmed: true,
  };
};

export const compressInternalSilenceFromWav = (
  bytes: Uint8Array<ArrayBuffer>,
  {
    threshold = 1000,
    minSilenceMs = 180,
    keepSilenceMs = 100,
  }: {
    threshold?: number;
    minSilenceMs?: number;
    keepSilenceMs?: number;
  } = {},
): CompressedWav => {
  const info = readWavInfo(bytes);

  if (info.bitsPerSample !== 16) {
    return {
      bytes,
      durationMs: info.durationMs,
      removedMs: 0,
      compressed: false,
    };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frameCount = Math.floor(info.dataSize / info.blockAlign);
  const minSilenceFrames = Math.round((minSilenceMs / 1000) * info.sampleRate);
  const keepSilenceFrames = Math.round((keepSilenceMs / 1000) * info.sampleRate);
  const ranges: Array<{ startFrame: number; endFrame: number }> = [];

  const isFrameSilent = (frameIndex: number) => {
    const frameOffset = info.dataOffset + frameIndex * info.blockAlign;

    for (let channelIndex = 0; channelIndex < info.channelCount; channelIndex += 1) {
      const sampleOffset = frameOffset + channelIndex * 2;
      const sample = view.getInt16(sampleOffset, true);

      if (Math.abs(sample) > threshold) {
        return false;
      }
    }

    return true;
  };

  let frameIndex = 0;
  let outputFrameCount = 0;

  const keepRange = (startFrame: number, endFrame: number) => {
    if (endFrame <= startFrame) {
      return;
    }

    ranges.push({ startFrame, endFrame });
    outputFrameCount += endFrame - startFrame;
  };

  while (frameIndex < frameCount) {
    const runStartFrame = frameIndex;
    const silent = isFrameSilent(frameIndex);

    while (frameIndex < frameCount && isFrameSilent(frameIndex) === silent) {
      frameIndex += 1;
    }

    const runEndFrame = frameIndex;
    const runFrameCount = runEndFrame - runStartFrame;
    const isInternalSilence =
      silent && runStartFrame > 0 && runEndFrame < frameCount;

    if (
      !isInternalSilence ||
      runFrameCount < minSilenceFrames ||
      runFrameCount <= keepSilenceFrames
    ) {
      keepRange(runStartFrame, runEndFrame);
      continue;
    }

    const keepBeforeFrames = Math.floor(keepSilenceFrames / 2);
    const keepAfterFrames = keepSilenceFrames - keepBeforeFrames;
    keepRange(runStartFrame, runStartFrame + keepBeforeFrames);
    keepRange(runEndFrame - keepAfterFrames, runEndFrame);
  }

  if (outputFrameCount === frameCount) {
    return {
      bytes,
      durationMs: info.durationMs,
      removedMs: 0,
      compressed: false,
    };
  }

  const dataSize = outputFrameCount * info.blockAlign;
  const output = writeWavHeader(info, dataSize);
  let outputOffset = 44;

  for (const range of ranges) {
    const inputOffset = info.dataOffset + range.startFrame * info.blockAlign;
    const inputSize = (range.endFrame - range.startFrame) * info.blockAlign;
    output.set(bytes.slice(inputOffset, inputOffset + inputSize), outputOffset);
    outputOffset += inputSize;
  }

  const durationMs = Math.round((outputFrameCount / info.sampleRate) * 1000);

  return {
    bytes: output,
    durationMs,
    removedMs: info.durationMs - durationMs,
    compressed: true,
  };
};

export const clipWavToDuration = (
  bytes: Uint8Array<ArrayBuffer>,
  maxDurationMs: number,
) => {
  const info = readWavInfo(bytes);

  if (info.durationMs <= maxDurationMs) {
    return {
      bytes,
      durationMs: info.durationMs,
      clipped: false,
    };
  }

  const frameCount = Math.max(1, Math.round((maxDurationMs / 1000) * info.sampleRate));
  const dataSize = Math.min(info.dataSize, frameCount * info.blockAlign);
  const output = writeWavHeader(info, dataSize);
  output.set(bytes.slice(info.dataOffset, info.dataOffset + dataSize), 44);

  return {
    bytes: output,
    durationMs: Math.round((dataSize / info.blockAlign / info.sampleRate) * 1000),
    clipped: true,
  };
};
