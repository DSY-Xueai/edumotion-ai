from __future__ import annotations

import argparse
import base64
import io
import os
import threading
from typing import Any

import soundfile as sf
import torch
import uvicorn
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from qwen_tts import Qwen3TTSModel


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1)
    speaker: str = "Vivian"
    language: str = "Chinese"
    instruct: str | None = None
    seed: int | None = None
    do_sample: bool = False
    temperature: float = 0.2
    top_p: float = 0.8


class BatchSpeechItem(BaseModel):
    id: str = Field(min_length=1)
    text: str = Field(min_length=1)
    speaker: str = "Vivian"
    language: str = "Chinese"
    instruct: str | None = None


class BatchSpeechRequest(BaseModel):
    items: list[BatchSpeechItem] = Field(min_length=1)
    seed: int | None = None
    do_sample: bool = False
    temperature: float = 0.2
    top_p: float = 0.8


def generation_kwargs(request: SpeechRequest | BatchSpeechRequest) -> dict[str, Any]:
    return {
        "do_sample": request.do_sample,
        "temperature": request.temperature,
        "top_p": request.top_p,
    }


class ServerState:
    def __init__(
        self,
        model_dir: str,
        device_map: str,
        dtype_name: str,
        attn_implementation: str | None,
        ref_audio: str | None,
        ref_text: str | None,
        x_vector_only_mode: bool,
    ) -> None:
        self.model_dir = model_dir
        self.device_map = device_map
        self.dtype_name = dtype_name
        self.attn_implementation = attn_implementation
        self.ref_audio = ref_audio
        self.ref_text = ref_text
        self.x_vector_only_mode = x_vector_only_mode
        self.model: Any | None = None
        self.voice_clone_prompt: Any | None = None
        self.lock = threading.Lock()

    def dtype(self) -> torch.dtype:
        if self.dtype_name == "float16":
            return torch.float16
        if self.dtype_name == "float32":
            return torch.float32
        return torch.bfloat16

    def load(self) -> None:
        kwargs: dict[str, Any] = {
            "device_map": self.device_map,
            "dtype": self.dtype(),
        }
        if self.attn_implementation:
            kwargs["attn_implementation"] = self.attn_implementation

        self.model = Qwen3TTSModel.from_pretrained(self.model_dir, **kwargs)
        model_type = getattr(getattr(self.model, "model", None), "tts_model_type", "")

        if model_type == "base":
            if not self.ref_audio:
                raise ValueError("QWEN_TTS_REF_AUDIO is required when loading a Base voice clone model.")
            if not self.x_vector_only_mode and not self.ref_text:
                raise ValueError("QWEN_TTS_REF_TEXT is required when x_vector_only_mode is false.")

            self.voice_clone_prompt = self.model.create_voice_clone_prompt(
                ref_audio=self.ref_audio,
                ref_text=self.ref_text,
                x_vector_only_mode=self.x_vector_only_mode,
            )

    def model_type(self) -> str:
        return str(getattr(getattr(self.model, "model", None), "tts_model_type", ""))


def create_app(state: ServerState) -> FastAPI:
    app = FastAPI(title="Remotion AI Qwen Local TTS")

    @app.on_event("startup")
    def startup() -> None:
        state.load()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {
            "status": "ok" if state.model is not None else "loading",
            "modelDir": state.model_dir,
            "modelType": state.model_type() if state.model is not None else "",
        }

    @app.get("/v1/speakers")
    def speakers() -> dict[str, list[str]]:
        if state.model is None:
            raise HTTPException(status_code=503, detail="Model is not loaded.")

        get_speakers = getattr(state.model, "get_supported_speakers", None)
        get_languages = getattr(state.model, "get_supported_languages", None)
        return {
            "speakers": list(get_speakers()) if callable(get_speakers) else [],
            "languages": list(get_languages()) if callable(get_languages) else [],
        }

    @app.post("/v1/audio/speech")
    def speech(request: SpeechRequest) -> Response:
        if state.model is None:
            raise HTTPException(status_code=503, detail="Model is not loaded.")

        try:
            if request.seed is not None:
                torch.manual_seed(request.seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed_all(request.seed)
            with state.lock:
                if state.model_type() == "base":
                    wavs, sample_rate = state.model.generate_voice_clone(
                        text=request.text,
                        language=request.language,
                        voice_clone_prompt=state.voice_clone_prompt,
                        **generation_kwargs(request),
                    )
                else:
                    wavs, sample_rate = state.model.generate_custom_voice(
                        text=request.text,
                        language=request.language,
                        speaker=request.speaker,
                        instruct=request.instruct or "",
                        **generation_kwargs(request),
                    )
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

        buffer = io.BytesIO()
        sf.write(buffer, wavs[0], sample_rate, format="WAV")
        return Response(content=buffer.getvalue(), media_type="audio/wav")

    @app.post("/v1/audio/speech-batch")
    def speech_batch(request: BatchSpeechRequest) -> dict[str, list[dict[str, str]]]:
        if state.model is None:
            raise HTTPException(status_code=503, detail="Model is not loaded.")

        try:
            if request.seed is not None:
                torch.manual_seed(request.seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed_all(request.seed)
            with state.lock:
                if state.model_type() == "base":
                    wavs, sample_rate = state.model.generate_voice_clone(
                        text=[item.text for item in request.items],
                        language=[item.language for item in request.items],
                        voice_clone_prompt=state.voice_clone_prompt,
                        **generation_kwargs(request),
                    )
                else:
                    wavs, sample_rate = state.model.generate_custom_voice(
                        text=[item.text for item in request.items],
                        language=[item.language for item in request.items],
                        speaker=[item.speaker for item in request.items],
                        instruct=[item.instruct or "" for item in request.items],
                        **generation_kwargs(request),
                    )
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

        response_items = []
        for item, wav in zip(request.items, wavs):
            buffer = io.BytesIO()
            sf.write(buffer, wav, sample_rate, format="WAV")
            response_items.append(
                {
                    "id": item.id,
                    "audioBase64": base64.b64encode(buffer.getvalue()).decode("ascii"),
                }
            )

        return {"items": response_items}

    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local Qwen3-TTS HTTP server.")
    parser.add_argument(
        "--model-dir",
        default=os.getenv(
            "QWEN_TTS_MODEL_DIR",
            r"D:\Qwen3-TTS\Qwen3-TTS-12Hz-1.7B-CustomVoice",
        ),
    )
    parser.add_argument("--host", default=os.getenv("QWEN_TTS_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("QWEN_TTS_PORT", "8020")))
    parser.add_argument("--device-map", default=os.getenv("QWEN_TTS_DEVICE_MAP", "cuda:0"))
    parser.add_argument("--dtype", default=os.getenv("QWEN_TTS_DTYPE", "bfloat16"))
    parser.add_argument(
        "--attn-implementation",
        default=os.getenv("QWEN_TTS_ATTN_IMPLEMENTATION", ""),
    )
    parser.add_argument("--ref-audio", default=os.getenv("QWEN_TTS_REF_AUDIO"))
    parser.add_argument("--ref-text", default=os.getenv("QWEN_TTS_REF_TEXT"))
    parser.add_argument(
        "--x-vector-only-mode",
        action="store_true",
        default=os.getenv("QWEN_TTS_X_VECTOR_ONLY_MODE", "false").lower() == "true",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    state = ServerState(
        model_dir=args.model_dir,
        device_map=args.device_map,
        dtype_name=args.dtype,
        attn_implementation=args.attn_implementation or None,
        ref_audio=args.ref_audio,
        ref_text=args.ref_text,
        x_vector_only_mode=args.x_vector_only_mode,
    )
    app = create_app(state)
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
