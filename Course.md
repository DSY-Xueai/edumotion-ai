# 当前状态
- 主链路已通：`curriculum -> research -> draft -> review -> audio/subtitle -> render -> topic status`
- 英语学科已接入 CET4/CET6 合并词库，按单词生成稳定 `topicId`
- 英语视频已经改成“单词卡”式：单词居中放大，英文发音段独立走 TTS，字幕层按音频 cue 对齐显示，中文解释段继续走中文 TTS

# 本轮变更
- 英语草稿去掉了固定音标展示，改为更通用的记忆文案模板
- 英语渲染改为单场景静态画面，取消英文场景底部旁白字幕层
- 英语词卡视觉简化为中央大词 + 中央释义，去掉“巧记/词性/音标”等干扰层
- 英文字幕层已经恢复，仍然按 `subtitleTrack.cues` 与音频时间同步
- 本地 Qwen TTS 的英文发音继续走单独英文段，并把自动启动参考音频默认切到 `reference-voice-focused.wav`

# 关键文件
- `src/lib/providers/createDraftProvider.ts`
- `src/lib/providers/createTtsProvider.ts`
- `src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx`
- `src/compositions/adaptiveMotion/visualModules.tsx`
- `src/lib/providers/config.ts`
- `src/lib/rendering/subjectAdapter.ts`
- `src/lib/research/schema.ts`
- `src/lib/review/schema.ts`
- `tests/providers/createDraftProvider.test.ts`
- `tests/providers/createTtsProvider.test.ts`
- `tests/providers/providerConfig.test.ts`
- `tests/rendering/subjectAdapterRegistry.test.ts`
- `tests/composition.test.tsx`
- `curriculum/pep-2019/english/wordbank.json`

# 运行入口
- `npm run cli -- research run --topic-id english-word-00002`
- `npm run cli -- review --action approve --topic-id english-word-00002`
- `TTS_PROVIDER=qwen-local npm run cli -- produce render --topic-id english-word-00002`
- `npm test`
- `npm run lint:types`

# 当前注意事项
- `abandon` 已补入音标 `/əˈbændən/`
- 英文场景现在显示底部字幕，但不再显示额外解释块，避免画面跳字和干扰信息
- 若后续某个英语词条仍缺音标，发音会继续按英文单词本身单独合成，但研究层可能只保留空音标字段
- 当前样例渲染路径：`workspace/videos/2026-5-7/03/english-word-00002/render/video.mp4`
