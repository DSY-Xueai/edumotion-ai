# 当前项目状态

- 项目已正式收口为 `topic-based` 高中数理化知识点短视频生产系统，主链路固定为：
  `curriculum -> research -> draft -> review approve -> audio/subtitle -> render -> topic status`
- 根仓库已切到新链路模型：
  - `Root` / `AutoVideoComposition` 正式消费 `RenderPackage`
  - `AutoVideoComposition` 默认走 `AdaptiveMotionComposition` 自适应 MotionLab 视觉编排，不再把所有学科固定套进旧 subject renderer 版式
  - 数学 / 物理 / 化学共用同一自适应渲染内核，按 subject、scene kind、payload 内容和字幕长度选择不同视觉模块
  - 旧的 article-based parser / normalizer / scene 组合已退役
- `npm run render` 仍保留，但只输出“旧入口已退役”的提示，不再承担正式生产职责。

# 本轮新增或变更

- 新增并生成“匀速圆周运动”预览样片：
  - 新增 topic：`physics-b2-ch6-topic-001`
  - 已生成 workspace：`workspace/topics/physics-b2-ch6-topic-001`
  - 已输出视频：`workspace/topics/physics-b2-ch6-topic-001/render/video.mp4`
  - 本次在 mock provider / mock audio fallback 下生成，视频可预览画面与字幕，但音频为占位音频。
- 主生成画面流程已全局替换为自适应 MotionLab 编排：
  - `AutoVideoComposition` 现在委托给 `AdaptiveMotionComposition`
  - 新增视觉模块选择器：按内容选择 `hero-focus / concept-map / formula-board / process-flow / compare-board / motion-diagram / particle-lab`
  - 正式 CLI 已重新输出：`workspace/topics/physics-b2-ch6-topic-001/render/video.mp4`
  - 新增主入口对比样片：`workspace/topics/physics-b2-ch6-topic-001/render/video-adaptive-motion.mp4`
  - 新增主入口抽帧：`workspace/topics/physics-b2-ch6-topic-001/render/adaptive-auto-video-frame.png`
  - 旧的 `src/subjects/*/renderScene.tsx` 固定学科画面和临时 `CircularMotionPreview` composition 已删除，避免后续主链路分叉。
- `zod` 已升级并固定到 Remotion 推荐的 `4.3.6`，避免 Remotion CLI 的依赖版本不一致警告。
- 主仓库已同步到新课程生产链路：
  - 新增 `research / draft / review / audio / rendering / providers / batch / doctor / provider probe` 相关实现
  - `curriculum/pep-2019/index.json` 已切到新的扁平 `topics` 结构，并录入数学、物理、化学样例 topic；当前额外包含物理 topic `physics-b2-ch6-topic-001`（匀速圆周运动）
  - `src/cli/index.ts` 已切到新命令集：`curriculum / research / draft / review / produce / pipeline / batch / doctor / provider / topic`
- 旧链路已淘汰：
  - 删除旧 article-based `ingest / parser / normalizer / runPipeline`
  - 删除旧 `VideoSpec` 场景模型与旧 `compositions/scenes/*`
  - 删除旧样片目录 `samples/` 与旧 fixture / 旧测试
- 测试体系已切到新链路：
  - 新增 `audio / draft / pipeline / providers / rendering / research / review / e2e` 测试
  - `vitest` 现在忽略 `.worktrees/`，避免把 worktree 内测试重复扫入
  - 测试 workspace 固定到 `.vitest/workspace/topics`
- 修复一处新链路路径问题：
  - `renderPackage.audioTracks[].sourceFile` 现在基于实际 `TOPIC_WORKSPACE_ROOT` 生成，不再硬编码 `workspace/topics/...`

# 关键修改文件

- `src/cli/index.ts`
- `src/cli/render.ts`
- `src/compositions/AutoVideoComposition.tsx`
- `src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx`
- `src/compositions/adaptiveMotion/selectVisualModule.ts`
- `src/compositions/adaptiveMotion/visualModules.tsx`
- `src/Root.tsx`
- `package.json`
- `package-lock.json`
- `src/lib/rendering/buildRenderPackage.ts`
- `src/lib/rendering/renderVideo.ts`
- `src/lib/rendering/saveRenderPackage.ts`
- `src/lib/rendering/schema.ts`
- `src/lib/pipeline/runApprovedToRender.ts`
- `src/lib/pipeline/runTopicToDraft.ts`
- `src/lib/pipeline/runBatch.ts`
- `src/lib/providers/config.ts`
- `src/lib/providers/probeRuntimeProvider.ts`
- `src/lib/audio/generateSegmentAudio.ts`
- `curriculum/pep-2019/index.json`
- `workspace/topics/physics-b2-ch6-topic-001/research/topic.json`
- `workspace/topics/physics-b2-ch6-topic-001/draft/lesson.json`
- `workspace/topics/physics-b2-ch6-topic-001/approved/lesson.json`
- `workspace/topics/physics-b2-ch6-topic-001/render/render-package.json`
- `workspace/topics/physics-b2-ch6-topic-001/render/video.mp4`
- `workspace/topics/physics-b2-ch6-topic-001/render/video-adaptive-motion.mp4`
- `tests/composition.test.tsx`
- `tests/pipeline/runApprovedToRender.test.ts`
- `vitest.config.ts`
- `README.md`

# 运行入口

- 安装依赖：`npm install`
- 全量测试：`npm test`
- 类型检查：`npm run lint:types`
- 启动 Remotion Studio：`npm run dev`
- 基础诊断：`npm run cli -- doctor`
- provider 探针：
  - `npm run cli -- provider probe`
  - `npm run cli -- provider probe --include-tts`
- 查看教材 topic：
  - `npm run cli -- curriculum list --subject math`
  - `npm run cli -- curriculum list --subject physics`
  - `npm run cli -- curriculum list --subject chemistry`
- 单个 topic 流程：
  - `npm run cli -- research run --topic-id <topicId>`
  - `npm run cli -- draft generate --topic-id <topicId>`
  - `npm run cli -- review --topic-id <topicId> --action approve --note pass`
  - `npm run cli -- produce render --topic-id <topicId>`
  - `npm run cli -- topic status --topic-id <topicId>`
- 一步推进：
  - `npm run cli -- pipeline to-draft --topic-id <topicId>`
  - `npm run cli -- pipeline to-render --topic-id <topicId>`
- 批处理：
  - `npm run cli -- batch run --topic-id <topicId> --topic-id <topicId>`
  - `npm run cli -- batch next`
- 旧入口提示命令：
  - `npm run render`

# 当前注意事项

- 正式成片默认要求真实可用的 TTS；如果运行时会退回 mock 音频，`produce render` / `pipeline to-render` 会直接报错。
- 如需导出测试视频，可显式使用 `--allow-mock-audio`，但这类视频包含占位音频，不应视为正式成片。
- `OPENAI_BASE_URL` 已纳入 provider 配置，可切 OpenAI-compatible 网关；真实运行时仍需按当前 provider 模式配置 API key / model。
- `workspace/` 与 `public/generated/` 已忽略；测试产物默认写入 `.vitest/workspace/topics`，不会污染真实工作区。
- 当前“匀速圆周运动”样片是本地预览版：内容文案已人工校正，语音仍为 mock 占位音频；若要正式成片，需要启用真实 TTS 后重新执行 `produce render`。
