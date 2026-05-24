# 当前状态
- 主链路已通：`curriculum -> research -> draft -> review -> audio/subtitle -> render -> topic status`
- 英语学科已接入 CET4/CET6 合并词库，按单词生成稳定 `topicId`
- 英语视频页面已从深色黑板模板改为明亮多巴胺词卡风：浅色渐变背景、白色纸卡、薄荷/奶油叠层、荧光笔强调、底部浅色字幕条
- 英语视频当前试验单词登场剪辑：仅在 `definition` 阶段让单词从屏幕外旋转滚入原本词卡位置；优先按 `seg-definition` 字幕 cue 对齐，滚入前单词完全隐藏，落位后不再运动；不改文案、字幕、音频和页面风格
- 英语草稿生成已加强记忆句语义约束：场景动作必须能直接证明中文义项，避免“没人碰/放在那里/不再继续就是...”这类弱解释
- 英语研究数据会用 `cmu-pronouncing-dictionary` 补齐词库缺失音标，并转成 IPA；英语质量检查包含 `phonetic`、`word-entrance-cue` 和 `mnemonic-grounding`
- 英文发音段独立走 TTS，字幕层按音频 cue 对齐显示；用户可审阅视频继续要求真实 TTS，不使用 mock audio
- `english-word-00001` 已按新页面重新生成并通过英语质量检查；`english-word-00002` 保留此前恢复后的单词课预览；`english-word-00003` 已按新音标补齐、新语义约束文案和当前单词滚入效果重新生成并通过英语质量检查；`english-word-00004` 已作为音标修复测试样片生成并通过英语质量检查；`english-word-00005` 到 `english-word-00020` 的旧产物仍处于已删除状态，等待后续批量生成

# 本轮变更
- 新增 `englishPhonetics`：词库没有音标时，从 CMU Pronouncing Dictionary 读取 ARPABET 并转成 IPA，例如 `abbreviation -> /əˌbriːviˈeɪʃən/`
- `createResearchProvider` 和英文发音 TTS 提示共用补齐后的音标，避免研究稿、页面和发音提示各走一套数据
- 更新 `checkEnglishVideoQuality`，新增 `phonetic` 检查，要求 approved lesson 和 render payload 都有音标；同时保留 `mnemonic-grounding` 和 `word-entrance-cue`
- 更新 `createDraftProvider` 的英语记忆句规则：`abandon/abandonment` 使用“决定停掉/停止推进”类动作；`abbreviation` 这类“缩写/缩短/节略”使用“长词/全称缩短成短形式”类动作
- 补充草稿生成、研究数据和英语质量测试：第四个词必须补出音标，空音标会被质量检查判失败
- 重新生成并渲染 `english-word-00003` 与 `english-word-00004`，二者完整英语质量检查均通过
- `english-word-00001` 最新视频路径：`workspace/videos/2026-5-7/02/english-word-00001/render/video.mp4`
- `english-word-00001` 页面预览截图：`workspace/videos/2026-5-7/02/english-word-00001/render/preview-3s.png`
- `english-word-00003` 最新视频路径：`workspace/videos/2026-5-24/01/english-word-00003/render/video.mp4`
- `english-word-00004` 最新视频路径：`workspace/videos/2026-5-24/02/english-word-00004/render/video.mp4`

# 关键文件
- `src/lib/curriculum/englishPhonetics.ts`
- `src/lib/providers/createResearchProvider.ts`
- `src/lib/providers/createDraftProvider.ts`
- `src/lib/providers/createTtsProvider.ts`
- `tests/providers/createDraftProvider.test.ts`
- `tests/providers/createMockProviders.test.ts`
- `src/lib/quality/checkEnglishVideoQuality.ts`
- `tests/quality/englishVideoQuality.test.ts`
- `src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx`
- `src/compositions/adaptiveMotion/visualModules.tsx`
- `tests/composition.test.tsx`
- `workspace/videos/2026-5-7/02/english-word-00001/approved/lesson.json`
- `workspace/videos/2026-5-24/01/english-word-00003/approved/lesson.json`
- `workspace/videos/2026-5-24/02/english-word-00004/approved/lesson.json`
- `docs/english-video-quality.md`
- `src/cli/commands/quality.ts`
- `src/lib/audio/wav.ts`
- `curriculum/pep-2019/english/wordbank.json`

# 运行入口
- `npm run cli -- research run --topic-id english-word-00002`
- `npm run cli -- review --action approve --topic-id english-word-00002`
- `TTS_PROVIDER=qwen-local npm run cli -- produce render --topic-id english-word-00001`
- `TTS_PROVIDER=qwen-local npm run cli -- produce render --topic-id english-word-00003`
- `TTS_PROVIDER=qwen-local npm run cli -- produce render --topic-id english-word-00004`
- `TTS_PROVIDER=qwen-local npm run cli -- quality english --topic-id english-word-00001`
- `TTS_PROVIDER=qwen-local npm run cli -- quality english --topic-id english-word-00003`
- `TTS_PROVIDER=qwen-local npm run cli -- quality english --topic-id english-word-00004`
- `npm test`
- `npm run lint:types`

# 当前注意事项
- 面向用户检查的视频不要用 `--allow-mock-audio`；分享前运行 `npm run cli -- quality english --topic-id <topic-id>`
- 批量英语视频生成前必须先确认字幕文案符合学习者视角，不要出现“第 N 个词”、topic id、render index 等内部信息
- 批量英语视频生成前要确认 `phonetic` 检查通过；当前 CET 词库大多缺音标，补齐逻辑依赖 CMU 北美发音词典，个别专有词或词典外词仍可能需要人工补音标
- 批量英语视频生成前还要确认记忆句能自然推出当前单词义项；只制造画面但不能证明词义的文案会被 `mnemonic-grounding` 判失败
- 当前多巴胺词卡会在缺音标时自动隐藏音标行；发音仍按英文单词本身单独合成
- `english-word-00001` 的旧文案来自早期模板，本轮仅为验证新页面和质量检查更新了该 topic 的 approved lesson，不代表批量生成策略已重新确认
- 下一轮若要生成 `english-word-00002` 到 `english-word-00020`，先确认字幕展示需求，再按新页面批量生成
