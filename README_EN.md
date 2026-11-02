<div align="center">

<h1>EduMotion AI</h1>

<p><a href="./README.md">中文</a> | English</p>

<p>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/Remotion-4-0B84F3" alt="Remotion 4" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="License: MIT" /></a>
</p>

</div>

<p align="center">
  <img src="./docs/Video_Generation_Overview.png" alt="From a concept to an educational video: enter a topic, generate content with AI, review, and produce the video" width="100%" />
</p>

## Purpose

**Describe a teaching topic in Codex or Claude Code to turn a concept, an English word, or lesson material into a vertical video with narration and subtitles.**

AI prepares the script and storyboard. After approval, the project generates speech, subtitles, and animated visuals. Scripts, storyboards, and intermediate files stay local for revision, reuse, and continued production.

## ✨ Features

- **Conversational workflow**: start with a topic or your own material, or reuse the included curriculum and CET4/CET6 vocabulary.
- **Draft review**: approve scripts and storyboards before production; revise and regenerate as needed.
- **Video production**: segmented speech synthesis, subtitle timing, and Remotion animation rendering to vertical MP4.
- **Subject visuals**: English vocabulary cards and visual templates for math, physics, and chemistry.
- **English quality checks**: phonetics, mnemonic copy, speech volume, subtitle duration, and the final audio track.

## 🚀 Quick Start

### 1. Install

Prepare Node.js 20+ LTS, npm 10+, Chrome or Edge, and an installed, signed-in copy of Codex or Claude Code.

The commands below use PowerShell:

```powershell
git clone https://github.com/DSY-Xueai/edumotion-ai.git
cd edumotion-ai
npm ci
```

### 2. Configure speech

Speech synthesis supports local Qwen3-TTS or OpenAI TTS. This example uses local Qwen.

Follow the [local speech setup guide](./docs/qwen-tts-local.md) to install the model and start the service. Then configure the terminal where you will launch the agent:

```powershell
$env:TTS_PROVIDER = "qwen-local"
$env:QWEN_TTS_BASE_URL = "http://127.0.0.1:8020"
$env:QWEN_TTS_AUTO_START = "false"
npm run cli -- doctor
```

These settings connect to an already running service. Replace the Python environment and model paths in the guide with your local paths.

<details>
<summary>Use OpenAI TTS instead</summary>

Set these variables before launching the agent:

```powershell
$env:PIPELINE_PROVIDER_MODE = "openai"
$env:OPENAI_API_KEY = "<API Key>"
$env:TTS_PROVIDER = "openai"
npm run cli -- doctor
```

This route uses speech synthesis and transcription endpoints for narration and subtitle timing, with corresponding API charges.

</details>

### 3. Start a conversation

In the same terminal, from the repository root, run `codex` or `claude` and enter:

```text
Create a vertical video teaching the English word "abandon" to Chinese learners.
Include pronunciation, Chinese meanings, and a memory example grounded in the meaning.
Aim for about 20 seconds. Show me the script and storyboard first.
After approval, use the configured speech service to generate an MP4.
```

Approve the draft to continue production. The default output location is:

```text
workspace/videos/<date>/<sequence>/<topic-id>/render/video.mp4
```

Follow the [English quality checklist](./docs/english-video-quality.md) to verify English videos. Full checks require `ffmpeg` and `ffprobe` on PATH.

## 🎬 Video Example

https://github.com/user-attachments/assets/225d2e6f-cc69-448c-ba29-c4c614230021

## Project Structure

```text
edumotion-ai/
├── AGENTS.md                 # AI production workflow and instructions
├── CLAUDE.md                 # Claude Code instruction entry point
├── curriculum/               # Curriculum and English vocabulary
├── assets/                   # Voice reference assets
├── src/
│   ├── cli/                  # Command entry points
│   ├── compositions/         # Video visuals and animation components
│   └── lib/                  # Scripts, review, audio, rendering, and quality
├── tools/qwen_tts_server/    # Local speech service
├── docs/                     # Speech setup and quality guidance
├── tests/                    # Automated tests
└── workspace/               # Drafts, audio, and rendered videos
```

## Known Limitations

- **Validation varies by subject**: English videos are the main optimization focus. Math, physics, and chemistry have fewer validated samples; check both the teaching content and its visual representation.
- **Custom results require adjustment**: videos use existing templates. Specific teaching styles, complex demonstrations, or different layouts may require changes to scripts, storyboards, and React/Remotion components.

## License

[MIT](./LICENSE)
