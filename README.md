# Remotion AI

面向高中数学、物理、化学知识点短视频的本地 CLI 生产系统。

当前主链路已经固定为：

`curriculum -> research -> draft -> review approve -> audio/subtitle -> render -> topic status`

旧的 article-based 原型已经退役，不再作为正式入口维护。

## 当前能力

- 以教材 `topic` 为最小生产单元
- 数学 / 物理 / 化学三套独立视觉系统
- `mock` 模式可本地快速出样片，不依赖 runtime API key
- `openai` 模式可接真实 `research / draft / TTS`
- `openai text + mock TTS` 混合模式可在不支持语音模型的网关上继续出片
- 输出 `mp4 + render-package + workspace artifacts`
- `doctor` 和 `provider probe` 支持运行时诊断

## 安装

```bash
npm install
```

## 运行模式

这个项目区分两类“AI”：

- 当前对话里的 AI：用于协助开发
- 项目运行时 provider：用于让 CLI 在本机自己联网调模型生成 `research / draft / TTS`

只有第二类才需要运行时凭证。

### 本地 mock 模式

```bash
set PIPELINE_PROVIDER_MODE=mock
set RENDER_OUTPUT_MODE=real
npm run cli -- doctor
npm run cli -- provider probe
```

### OpenAI 运行时模式

```bash
set PIPELINE_PROVIDER_MODE=openai
set RENDER_OUTPUT_MODE=real
set OPENAI_API_KEY=your-key
set OPENAI_BASE_URL=https://api.openai.com/v1
set RESEARCH_MODEL=gpt-5
set DRAFT_MODEL=gpt-5
set TTS_PROVIDER=openai
set TTS_MODEL=tts-1-hd
set TTS_VOICE=alloy
set TTS_RESPONSE_FORMAT=wav
set ALIGNMENT_MODEL=gpt-4o-transcribe
```

说明：

- `OPENAI_BASE_URL` 允许切到 OpenAI-compatible 网关，不把项目绑死在某个编辑器或单一入口
- `PIPELINE_PROVIDER_MODE=mock` 时不要求 `OPENAI_API_KEY`
- `PIPELINE_PROVIDER_MODE=openai` 时，CLI 会自己联网调用模型，因此需要运行时 provider key

### OpenAI 文本 + mock TTS 混合模式

适合结构化输出可用、但语音模型不可用的兼容网关：

```bash
set PIPELINE_PROVIDER_MODE=openai
set OPENAI_API_KEY=your-key
set OPENAI_BASE_URL=https://your-openai-compatible-gateway/v1
set RESEARCH_MODEL=gpt-5.4
set DRAFT_MODEL=gpt-5.4
set TTS_PROVIDER=mock
set RENDER_OUTPUT_MODE=real
```

这个模式下：

- `research / draft` 走真实模型
- `TTS` 使用本地 mock wav fallback
- 仍然可以渲染真实 mp4 并保留字幕时序

### Qwen3-TTS 本地配音模式

项目支持通过本地 FastAPI 服务调用 Qwen3-TTS：

```bash
set PIPELINE_PROVIDER_MODE=mock
set TTS_PROVIDER=qwen-local
set QWEN_TTS_BASE_URL=http://127.0.0.1:8020
set QWEN_TTS_SPEAKER=Vivian
set QWEN_TTS_LANGUAGE=Chinese
set RENDER_OUTPUT_MODE=real
npm run qwen:tts
```

服务实现位于 `tools/qwen_tts_server/server.py`，安装与模型下载见 `docs/qwen-tts-local.md`。`qwen-local` 会把每段旁白拆成中文短句，逐句合成后按真实 WAV 时长生成字幕对齐。

## 诊断

### 基础环境诊断

```bash
npm run cli -- doctor
```

返回内容包括：

- `providerMode`
- `renderMode`
- `ttsVoice`
- `ttsProvider`
- `openaiBaseUrl`
- `requiresApiKey`
- `apiKeyConfigured`
- `browserExecutableFound`
- `browserExecutable`
- `workspaceRoot`
- `publicGeneratedRoot`

### provider 探针

```bash
npm run cli -- provider probe
npm run cli -- provider probe --include-tts
```

用途：

- `probe`：验证当前运行时 provider 的结构化输出接口是否可用
- `probe --include-tts`：额外验证 TTS 和转写对齐链路
- 如果当前 `TTS_PROVIDER=mock`，探针会明确返回 `tts: "mock-ready"`

## 常用命令

### 查看教材 topic

```bash
npm run cli -- curriculum list --subject math
npm run cli -- curriculum list --subject physics
npm run cli -- curriculum list --subject chemistry
```

### 单个 topic 流程

```bash
npm run cli -- research run --topic-id math-b1-ch1-topic-001
npm run cli -- draft generate --topic-id math-b1-ch1-topic-001
npm run cli -- review --topic-id math-b1-ch1-topic-001 --action approve --note pass
npm run cli -- produce render --topic-id math-b1-ch1-topic-001
npm run cli -- topic status --topic-id math-b1-ch1-topic-001
```

### 一步推进

```bash
npm run cli -- pipeline to-draft --topic-id math-b1-ch1-topic-001
npm run cli -- pipeline to-render --topic-id math-b1-ch1-topic-001
```

### 批处理

```bash
npm run cli -- batch run --topic-id math-b1-ch1-topic-001 --topic-id physics-b1-ch1-topic-001
npm run cli -- batch next
```

## 产物目录

```text
workspace/topics/<topicId>/
  manifest.json
  research/topic.json
  draft/lesson.json
  approved/lesson.json
  audio/
    manifest.json
    *.wav
  render/
    render-package.json
    video.mp4
```

Remotion 渲染前会把音频复制到：

```text
public/generated/<topicId>/audio/
```

## 当前样片

当前仓库已经实际验证过：

- `math-b1-ch1-topic-001`
- `math-b1-ch1-topic-002`
- `physics-b1-ch1-topic-001`
- `chemistry-b1-ch1-topic-001`

## 验证

```bash
npm test
npm run lint:types
```

测试默认使用隔离 workspace：

```text
.vitest/workspace/topics
```

不会覆盖真实样片目录。
