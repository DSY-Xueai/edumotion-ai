# 当前项目状态
- 主链路已通：`curriculum -> research -> draft -> review -> audio/subtitle -> render -> topic status`。
- 英语学科接入 CET4/CET6 合并词库，按单词生成稳定 `topicId`；缺失音标会用 CMU Pronouncing Dictionary 补 IPA。
- 英语视频使用明亮多巴胺词卡风格，在 `definition` 阶段按 subtitle cue 做单词登场剪辑。
- 项目不绑定某一家 AI 模型；当前使用哪个 AI 工具，就由该工具按项目规则生成、检查和修正英语文案。
- `PIPELINE_PROVIDER_MODE=openai` 只是 CLI 自己联网生成 `research / draft / TTS` 的可选自动 provider 模式；不是当前 AI 协作流程的前提。
- mock provider 只用于开发测试；面向用户的英语视频必须使用真实音频并通过 `quality english`。
- 正式英语批量队列已支持显式 topic 范围或列表，串行生成，每个 topic 最多定向重试一次；失败产物会清理，只保留 batch 报告和失败原因。
- 小批量样片 `english-word-00014` 到 `english-word-00019` 已用真实 Qwen TTS 重新逐个生成，并通过包含音量、时序、画面和 ASR 覆盖率的 `quality english`。
- 批量样片 `english-word-00020` 到 `english-word-00025` 已用 Qwen TTS（采样模式）生成并通过质量检测。
- `quality english` 已加强音频门禁：除整段音量外，还检查音频段开头可听性和 subtitle cue 内部 1s 静音空窗。

# 本轮新增或变更
- 明确英语视频生产规则改为 AI 工具无关：当前系统给哪个 AI，就由哪个 AI 按项目要求完成文案与修正。
- README 运行模式说明已改为“可选自动 provider 模式”，避免把正式英语文案绑定到 OpenAI。
- 代码层已移除 `PIPELINE_PROVIDER_MODE=openai` 无 key 时的硬性配置失败；无 key 时 research/draft 回退本地规则，真实音频仍由 render gate 要求。
- 质量标准不降低：英语视频仍必须使用真实 TTS，并在分享前通过 `quality english`。

# 关键修改文件
- `README.md`
- `src/lib/providers/config.ts`
- `src/lib/providers/createResearchProvider.ts`
- `src/lib/providers/createDraftProvider.ts`
- `src/lib/providers/createTtsProvider.ts`
- `src/lib/providers/probeRuntimeProvider.ts`
- `src/cli/commands/doctor.ts`
- `tests/providers/providerConfig.test.ts`
- `tests/providers/createOpenAIProviders.test.ts`
- `tests/providers/createDraftProvider.test.ts`
- `tests/providers/probeRuntimeProvider.test.ts`
- `tests/cli/doctorCommand.test.ts`
- `Course.md`

# 运行入口
- 正式英语批量队列：`npm run cli -- batch english --from <topic-id> --to <topic-id> --target <n>`
- 显式列表批量队列：`npm run cli -- batch english --topic-id <topic-id> --topic-id <topic-id> --target <n>`
- 英语质量检查：`npm run cli -- quality english --topic-id <topic-id>`
- Provider + TTS 探测：`npm run cli -- provider probe --include-tts`
- 回归测试：`npm test`
- 类型检查：`npm run lint:types`

# 当前注意事项
- 面向用户检查的视频不要用 `--allow-mock-audio`；分享前必须跑 `quality english`。
- 当前 AI 协作生成英语视频时，不要求额外配置某家模型的 API key；如果改用 CLI 自动 provider 模式，配置了对应 provider key 才会联网调用该 provider。
- `PIPELINE_PROVIDER_MODE=openai` 且无 key 时不再阻塞配置，但默认 `TTS_PROVIDER=openai` 会被视为 mock 音频；面向用户渲染仍需 `TTS_PROVIDER=qwen-local` 或其他真实 TTS。
- `quality english` 需要本机可用的 Whisper CLI；默认模型是 `small`，可用 `ASR_WHISPER_COMMAND`、`ASR_WHISPER_MODEL`、`ASR_WHISPER_TIMEOUT_MS` 覆盖。
- ASR 是补充门禁，不替代现有质量检测；不要把中文逐字转写误差当成视频失败依据。
- 当前静音/延迟类问题主要由音量窗口门禁拦截，不做 Whisper 中文逐字匹配，避免误杀同音字或混合语言转写正常偏差。
- 大批量仍建议按显式 topic 范围分批跑，结束后查看 batch 报告里的失败 topic 和失败原因。
- Qwen TTS 对部分英文单词在确定性模式下发音偏软，可能导致 `video-cue-volume` 检测线 -24dB 不通过；若遇到，可尝试 `QWEN_TTS_DO_SAMPLE=true QWEN_TTS_TEMPERATURE=0.15` 启用低温采样。
- Qwen TTS 长期运行后 GPU 显存可能 OOM（RTX 4060 8GB），重启服务即可释放。

