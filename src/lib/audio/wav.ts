type WavInfo = {
  sampleRate: number;
  channelCount: number;
  bitsPerSample: number;
  blockAlign: number;
  dataOffset: number;
  dataSize: number;
  durationMs: number;
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
  view.setUint16(offset, first.channelCount, true);
  offset += 2;
  view.setUint32(offset, first.sampleRate, true);
  offset += 4;
  view.setUint32(offset, first.sampleRate * first.blockAlign, true);
  offset += 4;
  view.setUint16(offset, first.blockAlign, true);
  offset += 2;
  view.setUint16(offset, first.bitsPerSample, true);
  offset += 2;
  writeAscii(view, offset, "data");
  offset += 4;
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (const { bytes, info } of parsed) {
    output.set(
      bytes.slice(info.dataOffset, info.dataOffset + info.dataSize),
      offset,
    );
    offset += info.dataSize;
  }

  return output;
};
