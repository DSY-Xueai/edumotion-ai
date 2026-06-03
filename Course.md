# 当前项目状态

- 主链路已打通：`curriculum -> research -> draft -> review -> audio/subtitle -> render -> topic status`。
- 英语视频按 CET4/CET6 合并词库生成稳定 `topicId`，面向用户的视频必须使用真实 TTS，并通过 `quality english`。
- `quality english` 是自动化底线，不等同于最终人工质量判断；小批量交付前仍需要逐个检查文案、画面和音频。
- 视频底部文案字幕已升高到 `bottom: 330px`，用于避开平台底部标签遮挡；底部进度条仍保持原位置。
- 第 51 个单词 `english-word-00051` / `according` 已用 qwen-local 真实 TTS 生成预览视频，并通过 `quality english`。
- 第 44-70 个单词的历史产物已删除，因为文案、画面、音频质量未达到交付标准。

# 本轮新增或变更

- 仅调整视频上可见文案字幕容器位置：`src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx` 的 `CaptionStage bottom` 从 `116` 改为 `330`。
- 新增 composition 测试锁定字幕升高位置为 `bottom:330px`，防止回退到底部遮挡区。
- 为 `english-word-00051` 手写人工 draft；本地 mock draft provider 不能为 `according` 自动生成 grounded mnemonic。
- 上一轮生成产物：`workspace/videos/2026-6-3/01/english-word-00051/render/video.mp4`；截图预览：`workspace/videos/2026-6-3/01/english-word-00051/render/caption-position-preview.png`。该视频未按本轮 `bottom:330px` 重新生成；后续新渲染视频会使用 330 位置。
- 强化英语视频质量门禁，保留原有音量、ASR、时长上限、音标、词义锚点等有效规则。
- 新增 `teaching-structure`：拦截过短、缺少 definition/pronunciation/wrap、缺少教学展开段、字幕 cue 过少的视频。
- 新增 `script-audio-alignment`：要求 approved script、audio manifest、audio chunks、subtitle cues、render subtitles 文本一致，防止临时音频或字幕替换绕过质量检测。
- 新增 `visual-card-payload`：要求英文 definition 词卡包含 word、phonetic、partOfSpeech、meaning、mnemonic、contrast 和 subtitleCues。
- `duration` 从只检查不超过 30 秒，改为 8-30 秒区间，防止极短视频技术性通过。
- 批量队列将 `script-audio-alignment` 归为 `audio_quality`，避免音频/字幕问题错误触发文案重写。

# 关键修改文件

- `src/lib/quality/checkEnglishVideoQuality.ts`
- `src/lib/pipeline/englishBatch/runEnglishBatchQueue.ts`
- `src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx`
- `tests/composition.test.tsx`
- `tests/quality/englishVideoQuality.test.ts`
- `tests/pipeline/englishBatch/runEnglishBatchQueue.integration.test.ts`
- `workspace/videos/2026-6-3/01/english-word-00051/draft/lesson.json`
- `Course.md`

# 运行入口

- 正式英语批量队列：`npm run cli -- batch english --from <topic-id> --to <topic-id> --target <n>`
- 显式列表批量队列：`npm run cli -- batch english --topic-id <topic-id> --topic-id <topic-id> --target <n>`
- 英语质量检查：`npm run cli -- quality english --topic-id <topic-id>`
- 跳过媒体文件的结构检查：`npm run cli -- quality english --topic-id <topic-id> --skip-media`
- Provider + TTS 探测：`npm run cli -- provider probe --include-tts`
- 使用 qwen-local 真实 TTS 渲染单词：PowerShell 中先设 `$env:TTS_PROVIDER='qwen-local'`，再运行 `npm run cli -- produce render --topic-id <topic-id>`
- 回归测试：`npm test`
- 类型检查：`npm run lint:types`

# 当前注意事项

- 面向用户检查的视频不要使用 `--allow-mock-audio`。
- 自动门禁通过后，仍要逐个抽看小批量视频，重点看文案是否有教学价值、词卡信息是否完整、音频是否自然且与字幕一致。
- 单个单词异常优先按单词定向修复；只有大批量同类问题重复出现，才修改质量规则或生成规则。
- `script-audio-alignment` 失败通常说明音频或字幕产物被替换或未按批准稿生成，应先重跑音频/渲染链路，而不是直接改文案。
- Qwen TTS 长时间运行后可能受显存状态影响；遇到异常音频时先重启服务并定向重跑失败单词。
- `according` 预览中曾因 “怎么记 according？” 句首音量过低导致质量失败，最终人工 draft 已移除该弱开头并重新通过质量门禁。
