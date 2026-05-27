# 当前项目状态
- 主链路已通：`curriculum -> research -> draft -> review -> audio/subtitle -> render -> topic status`
- 英语学科接入 CET4/CET6 合并词库，按单词生成稳定 `topicId`，缺失音标会用 CMU Pronouncing Dictionary 补 IPA。
- 英语视频采用明亮多巴胺词卡风：浅色渐变背景、白色纸卡、薄荷/奶油叠层、荧光笔强调、底部浅色字幕条。
- 英语页当前有单词登场剪辑：仅 `definition` 阶段按 subtitle cue 让单词从屏幕外旋转滚入原词卡位置。
- 正式英语文案生产边界已调整：mock provider 只服务开发测试；正式批量文案应使用 `PIPELINE_PROVIDER_MODE=openai`，并在 draft 阶段做轻量质量验收与最多 3 次重试。
- 已通过新流程或人工审校生成并通过英语质量检查的样片：`english-word-00001`、`english-word-00003` 到 `english-word-00011`。`english-word-00002` 保留此前恢复后的单词课预览；`english-word-00012` 到 `english-word-00020` 等待后续生成。

# 本轮变更
- 新增 draft 阶段英语文案质量检查 `checkEnglishDraftQuality`：拦截泛化画面话术、元指令泄漏、弱 abandoned-object 场景，并要求记忆文案覆盖主释义 token。
- `createDraftProvider` 的 OpenAI 英语 draft 现在会在质量失败时把失败原因反馈进下一次 prompt，最多重试 3 次；仍失败则报错，不再继续流入 review/render。
- mock 英语 draft 删除最终通用兜底和词性泛兜底；未知义项会明确失败，避免几千词批量时伪成功产出弱模板。
- 调整测试：保留 mock 明确支持样例的唯一性测试，新增 `aboard` 未知 mock 拒绝测试，新增 OpenAI 英语弱文案重试测试。
- 因当前环境没有运行时 OpenAI key，本轮 `english-word-00010` 使用词库 research + 人工审校 draft 生成样片；文案用“从岸边上船、站到甲板里”证明 `aboard` 的“在船(车)上；上船”。
- `english-word-00010` 已用 `qwen-local` 真实 TTS 渲染并通过完整英语质量检查：总时长 26897ms，音量 mean_volume -25.2 dB / max_volume -7.0 dB，audio manifest 与 render package 时长一致。
- `english-word-00011` 使用词库 research + 人工审校 draft 生成样片；文案用“旧规章被整页划掉、盖章后明天起不再执行”证明 `abolish` 的“废除，取消”。
- `english-word-00011` 已用 `qwen-local` 真实 TTS 渲染并通过完整英语质量检查：总时长 26110ms，音量 mean_volume -24.7 dB / max_volume -6.8 dB，audio manifest 与 render package 时长一致。

# 关键修改文件
- `src/lib/draft/checkEnglishDraftQuality.ts`
- `src/lib/providers/createDraftProvider.ts`
- `tests/providers/createDraftProvider.test.ts`
- `tests/providers/createOpenAIProviders.test.ts`
- `workspace/videos/2026-5-28/01/english-word-00010/draft/lesson.json`
- `workspace/videos/2026-5-28/01/english-word-00010/approved/lesson.json`
- `workspace/videos/2026-5-28/01/english-word-00010/render/video.mp4`
- `workspace/videos/2026-5-28/02/english-word-00011/draft/lesson.json`
- `workspace/videos/2026-5-28/02/english-word-00011/approved/lesson.json`
- `workspace/videos/2026-5-28/02/english-word-00011/render/video.mp4`

# 运行入口
- 正式英语 draft：`PIPELINE_PROVIDER_MODE=openai npm run cli -- pipeline to-draft --topic-id <topic-id>`
- 审核通过：`npm run cli -- review --topic-id <topic-id> --action approve --note <note>`
- 真实 Qwen 渲染：`TTS_PROVIDER=qwen-local RENDER_OUTPUT_MODE=real npm run cli -- pipeline to-render --topic-id <topic-id>`
- 英语质量检查：`TTS_PROVIDER=qwen-local npm run cli -- quality english --topic-id <topic-id>`
- 回归测试：`npm test`
- 类型检查：`npm run lint:types`

# 当前注意事项
- 面向用户检查的视频不要用 `--allow-mock-audio`；分享前必须跑 `quality english`。
- 当前环境 `doctor` 显示未配置运行时 OpenAI key；正式批量文案生成前需要配置 `OPENAI_API_KEY`、`PIPELINE_PROVIDER_MODE=openai` 和合适的 `DRAFT_MODEL/RESEARCH_MODEL`。
- mock provider 不再承诺覆盖任意 CET 单词；未知英语词 draft 失败是预期行为，用来防止弱文案进入正式产物。
- 后续批量生成 `english-word-00012` 到 `english-word-00020` 前，先确认字幕展示需求和记忆句语义要求，再走正式 provider + quality retry 链路。
