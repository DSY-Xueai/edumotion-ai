# EduMotion AI

[中文](./README.md) | English

EduMotion AI is a local educational short-video production tool: select a curriculum topic or an English word, generate a lesson script, approve it, then automatically synthesize narration, create subtitles, and render a vertical MP4 with Remotion.

## Quick Start

Requirements:

- Node.js 20 LTS or a newer LTS release (currently verified with 24.5.0)
- npm 10 or later (currently verified with 11.5.1)
- Chrome or Edge

The examples below use PowerShell syntax.

### Install and check the environment

```powershell
git clone https://github.com/DSY-Xueai/edumotion-ai.git
cd edumotion-ai
npm install

$env:PIPELINE_PROVIDER_MODE = "mock"
$env:TTS_PROVIDER = "mock"
npm run cli -- doctor
```

`mock` mode does not call external models. It uses placeholder audio and is intended only to verify the content-production and video-rendering pipeline.

### Generate your first video

```powershell
# List available topics
npm run cli -- curriculum list --subject math

# Generate research and a storyboard draft
npm run cli -- pipeline to-draft --topic-id math-b1-ch1-topic-001

# Approve the draft
npm run cli -- review --topic-id math-b1-ch1-topic-001 --action approve --note pass

# Render a demo video with placeholder audio
npm run cli -- produce render --topic-id math-b1-ch1-topic-001 --allow-mock-audio
```

Generated files are stored in:

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

## Provider Configuration

Content generation and speech synthesis use separate providers and can be configured independently:

| Setting | Options | Purpose |
| --- | --- | --- |
| `PIPELINE_PROVIDER_MODE` | `mock` / `openai` | Generate research and draft files |
| `TTS_PROVIDER` | `mock` / `openai` / `qwen-local` | Generate segmented speech and subtitle timing |

Credentials are needed only when the `openai` provider is enabled. Speech is currently generated with the [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) service.

See [`docs/qwen-tts-local.md`](docs/qwen-tts-local.md) for the local Qwen3-TTS model, Python environment, and startup instructions. Do not use `--allow-mock-audio` for production videos.

## Project Structure

```text
curriculum/                     # Curriculum structure and CET4/CET6 vocabulary
src/cli/                        # CLI entry point, command routing, and argument parsing
src/compositions/               # Remotion compositions and subject visual modules
src/lib/curriculum/             # Topic loading, routing, vocabulary, and phonetics
src/lib/research/               # Research schemas, generation, and persistence
src/lib/draft/                  # Scripts, storyboards, and draft quality checks
src/lib/review/                 # Manual review, approved drafts, and revision state
src/lib/audio/                  # TTS, WAV processing, and subtitle timing
src/lib/rendering/              # Render Package assembly and MP4 rendering
src/lib/quality/                # Quality gates for English scripts, audio, and visuals
src/lib/pipeline/               # Single-item production, resume flow, and English batch queue
src/lib/providers/              # Mock, OpenAI-compatible, and Qwen providers
src/lib/workspace/              # Topic workspaces and state manifests
tests/                          # Unit, integration, and end-to-end tests
tools/qwen_tts_server/          # Local Qwen3-TTS HTTP service
docs/                           # Qwen3-TTS and English quality documentation
workspace/                      # Runtime outputs; not committed to Git
```

## Tech Stack

- **TypeScript + Node.js**: CLI, production orchestration, and file persistence.
- **React + Remotion**: subject visuals and vertical MP4 rendering.
- **Zod**: structured data validation across pipeline stages.
- **Qwen3-TTS**: local speech synthesis.
- **Vitest**: unit, integration, and end-to-end testing.

## Testing and Quality

Run type checking and automated tests after code changes:

```bash
npm run lint:types
npm test
```

English videos also require dedicated checks for script structure, subtitle alignment, volume, visual readability, and the final media file:

```powershell
npm run cli -- quality english --topic-id <topic-id>
```

See [`docs/english-video-quality.md`](docs/english-video-quality.md) for the complete rules. Automated checks define the delivery baseline; every production video should still be reviewed manually before release.
