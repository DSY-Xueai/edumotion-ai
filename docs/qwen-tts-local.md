# Qwen3-TTS 本地配音

本项目支持 `TTS_PROVIDER=qwen-local`，通过本地 FastAPI 服务调用 Qwen3-TTS CustomVoice 模型生成 WAV 配音。默认音色为 `Vivian`。

## 安装环境

```powershell
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts
pip install -U qwen-tts modelscope
pip install -r tools/qwen_tts_server/requirements.txt
```

如果本机没有 conda，也可以使用已有 Python 3.12：

```powershell
py -3.12 -m venv .venv-qwen
.\.venv-qwen\Scripts\python -m pip install -U pip
.\.venv-qwen\Scripts\python -m pip install modelscope
.\.venv-qwen\Scripts\python -m pip install -r tools\qwen_tts_server\requirements.txt
```

Windows 上如果 `torch.__version__` 显示 `+cpu`，说明装成了 CPU 版 PyTorch。RTX 4060 当前可用 CUDA wheel：

```powershell
.\.venv-qwen\Scripts\python -m pip install --force-reinstall torch==2.9.0 torchaudio==2.9.0 --index-url https://download.pytorch.org/whl/cu128
.\.venv-qwen\Scripts\python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

## 下载模型

```powershell
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --local_dir D:\Qwen3-TTS\Qwen3-TTS-12Hz-1.7B-CustomVoice
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-Base --local_dir D:\Qwen3-TTS\Qwen3-TTS-12Hz-1.7B-Base
```

当前项目可使用两条链路：

- `CustomVoice`：用于试听 9 个预设音色，或生成参考音频。
- `Base`：用于从参考音频提取固定 speaker embedding，让整条视频保持同一个音色。

## 启动服务

```powershell
conda activate qwen3-tts
npm run qwen:tts
```

等 `/health` 返回 `ok` 后，项目可通过 `http://127.0.0.1:8020/v1/audio/speech` 调用本地 TTS。

当前机器若没有 CUDA，可以用 CPU 参数启动测试：

```powershell
.\.venv-qwen\Scripts\python tools\qwen_tts_server\server.py --model-dir D:\Qwen3-TTS\Qwen3-TTS-12Hz-1.7B-CustomVoice --device-map cpu --dtype float32
```

CUDA 可用时使用默认 `npm run qwen:tts`，或显式指定：

```powershell
.\.venv-qwen\Scripts\python tools\qwen_tts_server\server.py --model-dir D:\Qwen3-TTS\Qwen3-TTS-12Hz-1.7B-CustomVoice --device-map cuda:0 --dtype bfloat16
```

若需要全片固定同一种声音，推荐启动 Base clone 服务。下面示例使用已生成的 Vivian 参考音频：

```powershell
.\.venv-qwen\Scripts\python tools\qwen_tts_server\server.py --model-dir D:\Qwen3-TTS\Qwen3-TTS-12Hz-1.7B-Base --device-map cuda:0 --dtype bfloat16 --ref-audio workspace\videos\2026-5-4\01\physics-b2-ch5-topic-001\audio\physics-b2-ch5-topic-001-seg-hook.wav --x-vector-only-mode
```

## 项目环境变量

```powershell
set PIPELINE_PROVIDER_MODE=mock
set TTS_PROVIDER=qwen-local
set QWEN_TTS_BASE_URL=http://127.0.0.1:8020
set QWEN_TTS_SPEAKER=Vivian
set QWEN_TTS_LANGUAGE=Chinese
set RENDER_OUTPUT_MODE=real
```

`qwen-local` 不需要 `OPENAI_API_KEY`。项目会把同一个 topic 的 approved script 一次性 batch 发送给 Qwen。每个段落仍会得到独立 WAV，字幕 chunks 按每段 WAV 的真实时长生成。

如果使用 `CustomVoice`，即使 speaker 固定为 `Vivian`，多段生成仍可能有音色漂移。需要“全片固定一种声音”时，应启动 `Base` clone 服务，让所有段落复用同一个 speaker embedding。

可选稳定性参数：

```powershell
set QWEN_TTS_SEED=20260504
```

## 生成示例

```powershell
npm run cli -- pipeline to-draft --topic-id physics-b2-ch5-topic-001
npm run cli -- review --topic-id physics-b2-ch5-topic-001 --action approve --note "本地 Qwen TTS 预览"
npm run cli -- produce render --topic-id physics-b2-ch5-topic-001
```
