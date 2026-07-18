# EduMotion AI

中文 | [English](./README_EN.md)

EduMotion AI 是一个本地运行的教学短视频生产工具：选择一个教材知识点或英语单词，生成教学文案，人工确认后自动配音、生成字幕，并用 Remotion 渲染成竖屏 MP4。

## 快速开始

运行环境：

- Node.js 20 LTS 或更高 LTS 版本（当前验证版本：24.5.0）
- npm 10 或更高版本（当前验证版本：11.5.1）
- Chrome 或 Edge

以下示例采用 PowerShell 语法。

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

启用 `openai` Provider 时才需要对应接口凭证。当前使用 [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) 服务生成语音。

本地 Qwen3-TTS 的模型、Python 环境和启动方式见 [`docs/qwen-tts-local.md`](docs/qwen-tts-local.md)。正式视频不要使用 `--allow-mock-audio`。

## 项目结构

```text
edumotion-ai/
├── curriculum/                  # 教材结构与 CET4/CET6 英语词库
├── assets/                      # 配音参考音频
├── src/
│   ├── cli/                     # CLI 入口、命令分发和参数解析
│   ├── compositions/            # Remotion Composition 与学科视觉模块
│   └── lib/
│       ├── curriculum/          # topic 加载、路由、词库和音标
│       ├── research/            # 教学资料生成和持久化
│       ├── draft/               # 文案、分镜和草稿检查
│       ├── review/              # 人工审核和修订状态
│       ├── audio/               # TTS、WAV 和字幕时序
│       ├── rendering/           # Render Package 与 MP4 渲染
│       ├── quality/             # 脚本、音频和画面质量检查
│       ├── pipeline/            # 单条生产、续跑和批量队列
│       ├── providers/           # Mock、OpenAI-compatible 与 Qwen Provider
│       └── workspace/           # topic 工作目录和状态管理
├── tools/
│   └── qwen_tts_server/         # 本地 Qwen3-TTS HTTP 服务
├── tests/                        # 单元、集成和端到端测试
├── docs/                         # Qwen3-TTS 与质量规则说明
├── skills/remotion/              # Remotion 制作规则
├── sox.py                        # Qwen3-TTS 的 SoX 兼容实现
├── package.json                  # 项目脚本与依赖
└── workspace/                    # 运行产物，不提交到 Git
```

## 技术栈

- **TypeScript + Node.js**：实现 CLI、生产编排和文件持久化。
- **React + Remotion**：定义学科画面并渲染竖屏 MP4。
- **Zod**：校验各阶段的结构化数据。
- **Qwen3-TTS**：生成本地语音。
- **Vitest**：运行单元、集成和端到端测试。

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

## License

MIT
