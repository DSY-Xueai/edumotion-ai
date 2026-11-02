<div align="center">

<h1>EduMotion AI</h1>

<p>中文 | <a href="./README_EN.md">English</a></p>

<p>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/Remotion-4-0B84F3" alt="Remotion 4" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="License: MIT" /></a>
</p>

</div>

<p align="center">
  <img src="./docs/Video_Generation_Overview.png" alt="从一个知识点，到一条教学视频：输入主题、AI 生成内容、人工审核、自动制作视频" width="100%" />
</p>

## 核心用途

**在 Codex 或 Claude Code 中描述教学主题，把知识点、英语单词或讲解资料制作成带配音和字幕的竖屏视频。**

AI 整理文案与分镜，确认后由项目完成配音、字幕和画面渲染。文案、分镜和各阶段产物保存在本地，便于修改、复用和继续制作。

## 核心功能

- **对话制作**：从主题或自带资料开始，也可复用内置教材目录与 CET4/CET6 词库。
- **草稿审核**：先确认文案和分镜，再生成视频，支持修改后重新制作。
- **自动成片**：分段配音、字幕时序处理、Remotion 动画渲染，输出竖屏 MP4。
- **学科画面**：提供英语词卡，以及数学、物理、化学的画面模板。
- **英语质量检查**：检查音标、记忆文案、配音音量、字幕时长及成片音轨。

## 快速上手

### 1. 安装项目

准备 Node.js 20+ LTS、npm 10+、Chrome 或 Edge，以及已安装并登录的 Codex 或 Claude Code。

以下命令使用 PowerShell：

```powershell
git clone https://github.com/DSY-Xueai/edumotion-ai.git
cd edumotion-ai
npm ci
```

### 2. 配置配音

配音支持本地 Qwen3-TTS 或 OpenAI TTS。以下以本地 Qwen 为例。

先按[本地配音指南](./docs/qwen-tts-local.md)安装模型并启动服务，再在准备运行代理的终端中设置：

```powershell
$env:TTS_PROVIDER = "qwen-local"
$env:QWEN_TTS_BASE_URL = "http://127.0.0.1:8020"
$env:QWEN_TTS_AUTO_START = "false"
npm run cli -- doctor
```

以上配置连接已启动的服务。指南中的 Python 环境和模型路径应替换为本机路径。

<details>
<summary>改用 OpenAI TTS</summary>

在运行代理前设置：

```powershell
$env:PIPELINE_PROVIDER_MODE = "openai"
$env:OPENAI_API_KEY = "<API Key>"
$env:TTS_PROVIDER = "openai"
npm run cli -- doctor
```

该路径使用语音合成和转写接口生成配音与字幕时序，产生相应 API 费用。

</details>

### 3. 在对话中开始制作

在同一终端、仓库根目录运行 `codex` 或 `claude`，输入：

```text
制作一条英语单词 abandon 的竖屏教学视频。
包含发音、中文释义和贴合词义的记忆示例，时长约 20 秒。
先给我文案和分镜，确认后使用已配置的配音生成 MP4。
```

确认草稿后继续制作，成品默认保存至：

```text
workspace/videos/<日期>/<序号>/<topic-id>/render/video.mp4
```

英语视频按[质量检查说明](./docs/english-video-quality.md)验证；完整检查需在 PATH 中提供 `ffmpeg` 和 `ffprobe`。

## 成片示例

[▶ 播放示例视频](./example.mp4)

## 项目结构

```text
edumotion-ai/
├── AGENTS.md                 # AI 制作流程与操作规则
├── CLAUDE.md                 # Claude Code 规则入口
├── curriculum/               # 教材目录与英语词库
├── assets/                   # 配音参考素材
├── src/
│   ├── cli/                  # 命令入口
│   ├── compositions/         # 视频画面与动画组件
│   └── lib/                  # 文案、审核、配音、渲染与质量检查
├── tools/qwen_tts_server/    # 本地配音服务
├── docs/                     # 配音配置与质量说明
├── tests/                    # 自动化测试
└── workspace/               # 草稿、音频及视频产物
```

## 已知问题

- **各学科验证程度不同**：英语视频是当前主要优化方向；数学、物理、化学的成片验证较少，制作后应重点检查知识表达和画面对应关系。
- **定制效果仍需调整**：成片基于现有模板，特定教学风格、复杂演示或不同版式可能需要调整文案、分镜及 React/Remotion 组件。

## License

[MIT](./LICENSE)
