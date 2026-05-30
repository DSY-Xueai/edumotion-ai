# 当前项目状态
- 主链路已通：`curriculum -> research -> draft -> review -> audio/subtitle -> render -> topic status`。
- 英语学科接入 CET4/CET6 合并词库，按单词生成稳定 `topicId`；缺失音标会用 CMU Pronouncing Dictionary 补 IPA。
- 英语视频使用明亮多巴胺词卡风格，在 `definition` 阶段按 subtitle cue 做单词登场剪辑。
- 正式英语文案生产应使用 `PIPELINE_PROVIDER_MODE=openai`；mock provider 只用于开发测试。
- 正式英语批量队列已支持显式 topic 范围或列表，串行生成，每个 topic 最多定向重试一次；失败产物会清理，只保留 batch 报告和失败原因。
- 小批量样片 `english-word-00014` 到 `english-word-00019` 已用真实 Qwen TTS 重新逐个生成，并通过包含音量、时序、画面和 ASR 覆盖率的 `quality english`。

# 本轮新增或变更
- 英语质量检测新增 `asr-transcript-coverage`：用 Whisper small 对最终 `video.mp4` 转写，只做保守覆盖检查。
- ASR 不做中文逐字匹配，中文解释完整性仍主要依赖现有 `audio-text-timing`、`audio-segment-quality`、`video-cue-volume` 和文案质量门。
- ASR 只拦截明显异常：转写为空或极短、目标英文单词未识别、ASR 识别到的字幕时间线覆盖低于 80%。
- 批量队列把 `asr-` 失败归为 `audio_quality`，继续沿用现有“一次重试，仍失败则记录并清理产物”的流程。

# 关键修改文件
- `src/lib/quality/checkEnglishAsrCoverage.ts`
- `src/lib/quality/checkEnglishVideoQuality.ts`
- `src/lib/pipeline/englishBatch/runEnglishBatchQueue.ts`
- `tests/quality/englishAsrCoverage.test.ts`
- `tests/quality/englishVideoQuality.test.ts`

# 运行入口
- 正式英语批量队列：`npm run cli -- batch english --from <topic-id> --to <topic-id> --target <n>`
- 显式列表批量队列：`npm run cli -- batch english --topic-id <topic-id> --topic-id <topic-id> --target <n>`
- 英语质量检查：`npm run cli -- quality english --topic-id <topic-id>`
- Provider + TTS 探测：`npm run cli -- provider probe --include-tts`
- 回归测试：`npm test`
- 类型检查：`npm run lint:types`

# 当前注意事项
- 面向用户检查的视频不要用 `--allow-mock-audio`；分享前必须跑 `quality english`。
- `quality english` 现在需要本机可用的 Whisper CLI；默认模型是 `small`，可用 `ASR_WHISPER_COMMAND`、`ASR_WHISPER_MODEL`、`ASR_WHISPER_TIMEOUT_MS` 覆盖。
- ASR 是补充门禁，不替代现有质量检测；不要把中文逐字转写误差当成视频失败依据。
- 大批量仍建议按显式 topic 范围分批跑，结束后查看 batch 报告里的失败 topic 和失败原因。
