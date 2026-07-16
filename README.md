# EduMotion AI

> 可扩展的多学科 AI 教学短视频生产流水线。

EduMotion AI 使用 TypeScript 和 Remotion，将教材知识点转化为经过审核、配音、字幕对齐和质量检测的竖屏教学视频。目前支持数学、物理、化学和英语，并通过学科适配器扩展内容结构与视觉风格。

```text
curriculum → research → draft → review → audio/subtitle → render → quality
```

## 核心能力

- 以教材 `topic` 为最小生产单元，保存完整中间产物，支持暂停和续跑
- 数学、物理、化学、英语使用独立的内容规则和视觉模块
- 支持本地 Mock、OpenAI-compatible Provider 和本地 Qwen3-TTS
- 根据真实音频时长生成字幕时间轴，输出 9:16 Remotion 视频
- 对英语视频检查教学结构、音标、字幕、音频、画面及脚本一致性
- 支持单条生产、批量队列、失败分类和定向重试

## 快速开始

### 1. 安装

```bash
npm install
```

### 2. 检查本地环境

无需 API Key 即可使用 Mock Provider 验证完整流程：

```powershell
$env:PIPELINE_PROVIDER_MODE = "mock"
$env:RENDER_OUTPUT_MODE = "real"
npm run cli -- doctor
npm run cli -- provider probe
```

### 3. 生成教学视频

```powershell
# 查看课程知识点
npm run cli -- curriculum list --subject math

# 生成 research 和 draft
npm run cli -- pipeline to-draft --topic-id math-b1-ch1-topic-001

# 审核文案
npm run cli -- review --topic-id math-b1-ch1-topic-001 --action approve --note pass

# 开发预览允许使用 Mock 音频
npm run cli -- produce render --topic-id math-b1-ch1-topic-001 --allow-mock-audio
```

成片和过程文件会写入：

```text
workspace/videos/YYYY-M-D/NN/<topicId>/
├── manifest.json
├── research/topic.json
├── draft/lesson.json
├── approved/lesson.json
├── audio/
└── render/
    ├── render-package.json
    └── video.mp4
```

## 真实语音

最终视频应使用真实 TTS。项目支持 OpenAI-compatible TTS，也支持本地 Qwen3-TTS 服务：

```powershell
$env:PIPELINE_PROVIDER_MODE = "mock"
$env:TTS_PROVIDER = "qwen-local"
$env:QWEN_TTS_BASE_URL = "http://127.0.0.1:8020"
$env:QWEN_TTS_SPEAKER = "Vivian"
$env:QWEN_TTS_LANGUAGE = "Chinese"
$env:RENDER_OUTPUT_MODE = "real"

npm run qwen:tts
npm run cli -- produce render --topic-id english-word-00001
npm run cli -- quality english --topic-id english-word-00001
```

Qwen3-TTS 的安装和模型配置参见 [`docs/qwen-tts-local.md`](docs/qwen-tts-local.md)。

## 常用命令

| 目标 | 命令 |
| --- | --- |
| 查看运行配置 | `npm run cli -- doctor` |
| 探测 Provider 与 TTS | `npm run cli -- provider probe --include-tts` |
| 查看 topic 状态 | `npm run cli -- topic status --topic-id <topic-id>` |
| 一步生成草稿 | `npm run cli -- pipeline to-draft --topic-id <topic-id>` |
| 渲染已批准内容 | `npm run cli -- produce render --topic-id <topic-id>` |
| 批量生成英语视频 | `npm run cli -- batch english --from <id> --to <id> --target <n>` |
| 检查英语视频质量 | `npm run cli -- quality english --topic-id <topic-id>` |

## 项目结构

```text
curriculum/                 教材与英语词库
src/cli/                    CLI 命令入口
src/lib/                    内容、音频、渲染与质量流水线
src/compositions/           Remotion 画面与学科视觉模块
tests/                      单元、集成和端到端测试
tools/qwen_tts_server/      本地 Qwen3-TTS 服务
workspace/                  运行时生产产物（不提交）
```

## 验证

```bash
npm test
npm run lint:types
```

测试使用隔离的 `.vitest/workspace`，不会覆盖本地视频产物。
