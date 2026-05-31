# 当前项目状态
- 主链路已通：`curriculum -> research -> draft -> review -> audio/subtitle -> render -> topic status`。
- 英语学科接入 CET4/CET6 合并词库，按单词生成稳定 `topicId`；缺失音标会用 CMU Pronouncing Dictionary 补 IPA。
- 英语视频使用明亮多巴胺词卡风格，在 `definition` 阶段按 subtitle cue 做单词登场剪辑。
- 正式英语文案生产应使用 `PIPELINE_PROVIDER_MODE=openai`；mock provider 只用于开发测试。
- 正式英语批量队列已支持显式 topic 范围或列表，串行生成，每个 topic 最多定向重试一次；失败产物会清理，只保留 batch 报告和失败原因。
- 小批量样片 `english-word-00014` 到 `english-word-00019` 已用真实 Qwen TTS 重新逐个生成，并通过包含音量、时序、画面和 ASR 覆盖率的 `quality english`。
- 批量样片 `english-word-00020` 到 `english-word-00025` 已用 Qwen TTS（采样模式）生成并通过质量检测。
- `quality english` 已加强音频门禁：除整段音量外，还检查音频段开头可听性和 subtitle cue 内部 1s 静音空窗。

# 本轮新增或变更
- 重新生成 `english-word-00020`，修复旧视频 `compare` 段开头低音量/延迟和漏读问题；新视频通过 `quality english`。
- 查明旧质量门误放行原因：`audio-segment-quality` 和 `video-cue-volume` 只看整段/整 cue 是否有可用音量，`asr-transcript-coverage` 只做全片覆盖率兜底。
- 加强 `quality english`：`audio-segment-quality` 检查每段前 800ms 可听性；`video-cue-volume` 按 1s 窗口检查 cue 内部静音空窗。

# 关键修改文件
- `src/lib/quality/checkEnglishVideoQuality.ts`
- `tests/quality/englishVideoQuality.test.ts`
- `workspace/videos/2026-5-30/01/english-word-00020/` — 第20个单词重新生成后的 audio、render 产物
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
- `quality english` 需要本机可用的 Whisper CLI；默认模型是 `small`，可用 `ASR_WHISPER_COMMAND`、`ASR_WHISPER_MODEL`、`ASR_WHISPER_TIMEOUT_MS` 覆盖。
- ASR 是补充门禁，不替代现有质量检测；不要把中文逐字转写误差当成视频失败依据。
- 当前静音/延迟类问题主要由音量窗口门禁拦截，不做 Whisper 中文逐字匹配，避免误杀同音字或混合语言转写正常偏差。
- 大批量仍建议按显式 topic 范围分批跑，结束后查看 batch 报告里的失败 topic 和失败原因。
- Qwen TTS 对部分英文单词在确定性模式下发音偏软，可能导致 `video-cue-volume` 检测线 -24dB 不通过；若遇到，可尝试 `QWEN_TTS_DO_SAMPLE=true QWEN_TTS_TEMPERATURE=0.15` 启用低温采样。
- Qwen TTS 长期运行后 GPU 显存可能 OOM（RTX 4060 8GB），重启服务即可释放。

