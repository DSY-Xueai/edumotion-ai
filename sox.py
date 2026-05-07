from __future__ import annotations

import math
from dataclasses import dataclass

import librosa
import numpy as np


@dataclass
class _NormConfig:
  db_level: float = -6.0


class Transformer:
  def __init__(self) -> None:
    self._norm = _NormConfig()

  def norm(self, db_level: float = -6.0) -> "Transformer":
    self._norm = _NormConfig(db_level=float(db_level))
    return self

  def build_array(self, input_array, sample_rate_in: int):
    audio = np.asarray(input_array, dtype=np.float32)
    if audio.ndim > 1:
      audio = np.mean(audio, axis=-1)

    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > 0:
      target_peak = 10 ** (self._norm.db_level / 20.0)
      audio = audio * (target_peak / peak)

    if sample_rate_in != 16000 and audio.size:
      audio = librosa.resample(audio, orig_sr=sample_rate_in, target_sr=16000)

    clip = 0.999
    return np.clip(audio, -clip, clip).astype(np.float32, copy=False)
