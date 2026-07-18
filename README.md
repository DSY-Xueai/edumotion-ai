# EduMotion AI

EduMotion AI 是一个本地运行的教学短视频生产工具：选择一个教材知识点或英语单词，生成教学文案，人工确认后自动配音、生成字幕，并用 Remotion 渲染成竖屏 MP4

例如，输入数学知识点 `math-b1-ch1-topic-001`，项目会依次生成：

```text
资料摘要 → 分镜文案 → 审核稿 → 配音与字幕 → 1080 × 1920 视频
```

最终得到 `video.mp4`，同时保留文案、音频和渲染数据，方便检查或重新生成。目前支持数学、物理、化学和 CET4/CET6 英语词汇。

## 快速开始

需要 Node.js、npm，以及本机 Chrome 或 Edge。以下命令使用 PowerShell。

### 安装并检查环境

```powershell
git clone https://github.com/DSY-Xueai/edumotion-ai.git
cd edumotion-ai
npm install

$env:PIPELINE_PROVIDER_MODE = "mock"
$env:TTS_PROVIDER = "mock"
npm run cli -- doctor
```

`mock` 模式不调用外部模型，语音为占位音，只用于验证内容生产和视频渲染链路。

### 生成第一条视频

```powershell
# 查看可用知识点
npm run cli -- curriculum list --subject math

# 生成资料和分镜草稿
npm run cli -- pipeline to-draft --topic-id math-b1-ch1-topic-001

# 批准草稿
npm run cli -- review --topic-id math-b1-ch1-topic-001 --action approve --note pass

# 使用占位音频渲染演示视频
npm run cli -- produce render --topic-id math-b1-ch1-topic-001 --allow-mock-audio
```

生成结果位于：

```text
workspace/videos/<日期>/<序号>/math-b1-ch1-topic-001/
├── research/topic.json
├── draft/lesson.json
├── approved/lesson.json
├── audio/
└── render/
    ├── render-package.json
    └── video.mp4
```

## Provider 配置

内容生成和语音生成使用独立 Provider，可以按运行环境分别选择：

| 配置项 | 可选值 | 作用 |
| --- | --- | --- |
| `PIPELINE_PROVIDER_MODE` | `mock` / `openai` | 生成 research 和 draft |
| `TTS_PROVIDER` | `mock` / `openai` / `qwen-local` | 生成分段语音和字幕时序 |

- `mock`：无需外部服务，用于本地开发和流程检查。
- `openai`：通过 OpenAI-compatible 接口生成结构化内容或语音，需要配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和对应模型。
- `qwen-local`：通过本地 [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) 服务生成语音。当前项目主要使用该方案，但 TTS Provider 与生产流水线解耦，可以接入其他实现。

本地 Qwen3-TTS 的模型、Python 环境和启动方式见 [`docs/qwen-tts-local.md`](docs/qwen-tts-local.md)。正式视频不要使用 `--allow-mock-audio`。

## 架构与项目结构

CLI 负责推进 topic 状态；各阶段通过 JSON、WAV 和 Render Package 交换数据。Zod Schema 校验阶段产物，Subject Adapter 选择学科视觉模块，Provider 层隔离内容模型和 TTS 实现，Remotion 只消费已经批准的渲染数据。

```text
curriculum/                     # 教材结构与 CET4/CET6 英语词库
src/cli/                        # CLI 入口、命令分发和参数解析
src/compositions/               # Remotion Composition 与学科视觉模块
src/lib/curriculum/             # topic 加载、路由、词库和音标
src/lib/research/               # 教学资料结构、生成和持久化
src/lib/draft/                  # 文案、分镜和草稿质量检查
src/lib/review/                 # 人工审核、批准稿和修订状态
src/lib/audio/                  # TTS、WAV 处理和字幕时序
src/lib/rendering/              # Render Package 构建与 MP4 渲染
src/lib/quality/                # 英语脚本、音频和画面质量门禁
src/lib/pipeline/               # 单条生产、续跑和英语批量队列
src/lib/providers/              # Mock、OpenAI-compatible 与 Qwen Provider
src/lib/workspace/              # topic 工作目录和状态清单
tests/                          # 单元、集成和端到端测试
tools/qwen_tts_server/          # 本地 Qwen3-TTS HTTP 服务
docs/                           # Qwen3-TTS 与英语质量规则说明
workspace/                      # 运行产物，不提交到 Git
```

## 技术栈

- **TypeScript + Node.js**：实现 CLI、生产编排和文件持久化。
- **React + [Remotion](https://github.com/remotion-dev/remotion)**：定义学科画面组件并渲染 1080 × 1920 MP4。
- **Zod**：约束 research、draft、audio manifest 和 render package 等阶段数据。
- **[Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)**：当前使用的本地语音合成方案；Provider 接口允许替换其他 TTS。
- **Vitest**：覆盖课程、Provider、音频、渲染、质量门禁和完整生产链路。

## 测试与质量

代码修改通过类型检查和自动化测试确认：

```bash
npm run lint:types
npm test
```

英语成片还需要独立检查脚本结构、字幕对齐、音量、画面可读性和最终媒体文件：

```powershell
npm run cli -- quality english --topic-id <topic-id>
```

完整规则见 [`docs/english-video-quality.md`](docs/english-video-quality.md)。自动检查是交付底线，正式发布前仍需人工观看成片。
