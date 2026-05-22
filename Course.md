# 当前状态
- 主链路已通：`curriculum -> research -> draft -> review -> audio/subtitle -> render -> topic status`
- 英语学科已接入 CET4/CET6 合并词库，按单词生成稳定 `topicId`
- 英语视频页面已从深色黑板模板改为明亮多巴胺词卡风：浅色渐变背景、白色纸卡、薄荷/奶油叠层、荧光笔强调、底部浅色字幕条
- 英文发音段独立走 TTS，字幕层按音频 cue 对齐显示；用户可审阅视频继续要求真实 TTS，不使用 mock audio
- `english-word-00001` 已按新页面重新生成并通过英语质量检查；`english-word-00002` 保留此前恢复后的单词课预览；`english-word-00003` 到 `english-word-00020` 的旧产物仍处于已删除状态，等待确认字幕策略后再批量生成

# 本轮变更
- 将英语背景从深黑冷光 + 网格改为奶油黄、薄荷绿、浅蓝的明亮渐变学习背景
- 将 `VocabularyCard` 从 `chalkboard-vocab` 改为 `dopamine-vocab`，保留中央大单词、可选音标、释义，但改为白色纸卡、彩色叠层和轻量高亮线
- 移除英语顶部灯泡、学士帽星星等卡通装饰，替换为低干扰荧光笔划痕和纸片装饰
- 英语字幕条改为浅色半透明卡片，文字使用深色，提高明亮背景下的可读性
- 更新 `tests/composition.test.tsx`，断言英语视频使用新多巴胺模板，并确保旧黑板模板和旧图标不再出现
- 为验证第一个单词，修正 `english-word-00001` 的旧 approved 文案为学习者可见 6 段短句，并用 `qwen-local` 真实音频重新渲染
- `english-word-00001` 最新视频路径：`workspace/videos/2026-5-7/02/english-word-00001/render/video.mp4`
- `english-word-00001` 页面预览截图：`workspace/videos/2026-5-7/02/english-word-00001/render/preview-3s.png`

# 关键文件
- `src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx`
- `src/compositions/adaptiveMotion/visualModules.tsx`
- `tests/composition.test.tsx`
- `workspace/videos/2026-5-7/02/english-word-00001/approved/lesson.json`
- `docs/english-video-quality.md`
- `src/lib/quality/checkEnglishVideoQuality.ts`
- `src/cli/commands/quality.ts`
- `src/lib/providers/createTtsProvider.ts`
- `src/lib/audio/wav.ts`
- `curriculum/pep-2019/english/wordbank.json`

# 运行入口
- `npm run cli -- research run --topic-id english-word-00002`
- `npm run cli -- review --action approve --topic-id english-word-00002`
- `TTS_PROVIDER=qwen-local npm run cli -- produce render --topic-id english-word-00001`
- `TTS_PROVIDER=qwen-local npm run cli -- quality english --topic-id english-word-00001`
- `npm test`
- `npm run lint:types`

# 当前注意事项
- 面向用户检查的视频不要用 `--allow-mock-audio`；分享前运行 `npm run cli -- quality english --topic-id <topic-id>`
- 批量英语视频生成前必须先确认字幕文案符合学习者视角，不要出现“第 N 个词”、topic id、render index 等内部信息
- 当前多巴胺词卡会在缺音标时自动隐藏音标行；发音仍按英文单词本身单独合成
- `english-word-00001` 的旧文案来自早期模板，本轮仅为验证新页面和质量检查更新了该 topic 的 approved lesson，不代表批量生成策略已重新确认
- 下一轮若要生成 `english-word-00002` 到 `english-word-00020`，先确认字幕展示需求，再按新页面批量生成
