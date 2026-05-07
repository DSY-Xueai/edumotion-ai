# 当前项目状态
- 项目是 topic-based 的数理化 + 英语短视频生成系统，主链路为 curriculum -> research -> draft -> review approve -> audio/subtitle -> render -> topic status。
- 英语学科已接入，词库来源为合并后的 CET4/CET6 本地词库，并按单词去重后生成稳定序号。
- 英语视频现在支持词内分轨发音：英语单词段走英语 TTS，中文解释继续走中文 TTS。

# 本轮变更
- 英语文案改成接近 dy_7483426954834660635.mp4 的单词卡模板：一秒记一个单词、释义、怎么记、联想例句、独立发音 beat、回顾。
- 英语 pronunciation 段现在即使没有 OpenAI key，也会在 qwen-local 下切到 English language + 英语发音提示，避免中文式读法。
- 英语 draft 的 scriptSegments / storyboardScenes 重新收紧，保证字幕、音频和画面能按行对齐。
- 继续保留并验证了英文单词样片 english-word-00001。

# 关键文件
- src/lib/providers/createDraftProvider.ts
- src/lib/providers/createTtsProvider.ts
- src/lib/rendering/subjectAdapter.ts
- src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx
- tests/providers/createDraftProvider.test.ts
- tests/providers/createTtsProvider.test.ts
- curriculum/pep-2019/english/wordbank.json
- src/lib/curriculum/englishWordbank.ts

# 运行入口
- npm run cli -- curriculum list --subject english --volume cet
- npm run cli -- produce render --topic-id english-word-00001
- npm run qwen:tts
- npm run dev
- npm test
- npm run lint:types

# 当前注意事项
- 英语单词生成按 topic 序号推进，避免重复生成相同单词。
- qwen-local 首次渲染会自动拉起本地 Qwen3-TTS Base clone 服务。
- 生成正式成片仍应使用真 TTS；mock audio 只适合画面链路验证。
- 英语 pronunciation 段现在有 OpenAI 优先、Qwen 英语兜底两层路径。
