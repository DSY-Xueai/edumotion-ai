# 当前项目状态
- 项目是 topic-based 的数理化 + 英语短视频生成系统，主链路为 curriculum -> research -> draft -> review approve -> audio/subtitle -> render -> topic status。
- 英语学科已接入，词库来源为合并后的 CET4/CET6 本地词库，并按单词去重后生成稳定序号。
- 英语视频现在支持“词内分轨”发音：单词发音段走英文 TTS，后续中文解释继续走中文 TTS。

# 本轮变更
- 英语 draft 改成“发音优先”的单词卡结构：pronunciation / hook / definition / process / compare / wrap。
- 英语 TTS 改为：英语 pronunciation 段在有 OpenAI key 时走英文语音，其余中文段继续走 Qwen 本地 TTS。
- 英语场景标签更新为更贴近单词卡流程，便于字幕与画面对齐。
- 抽取并确认了 dy_7483426954834660635.mp4 的文案风格，可作为后续英语单词视频模板。

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
