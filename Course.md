# 当前项目状态

- 项目是 topic-based 高中数理化短视频生产系统，主链路为：`curriculum -> research -> draft -> review approve -> audio/subtitle -> render -> topic status`。
- `Root` 只注册 `AutoVideo`；`AutoVideoComposition` 消费 `RenderPackage` 并委托给 `AdaptiveMotionComposition`。
- 当前画面系统是 adaptive MotionLab：按学科、场景类型、payload 内容和 topic 语义选择视觉模块。
- 生成产物工作区已改为视频批次归档：默认写入 `workspace/videos/YYYY-M-D/NN/<topicId>/`，其中 `NN` 为当天从 `01` 开始递增的两位序号。
- 旧 article parser / normalizer / scene components / `src/subjects/*/renderScene.tsx` / `CircularMotionPreview` 已退役。
- `zod` 固定为 `4.3.6`，与 Remotion 当前依赖保持一致。

# 本轮变更

- 改造 topic workspace 路径规则：
  - 默认根目录从 `workspace/topics` 改为 `workspace/videos`。
  - 新 topic 会写入 `workspace/videos/YYYY-M-D/01/<topicId>/`；同一天继续生成新视频时依次使用 `02`、`03`。
  - 同一个 topic 后续 research/draft/approved/audio/render 阶段会复用已经存在的日期/序号目录。
  - 仍支持 `TOPIC_WORKSPACE_ROOT` 覆盖根目录；测试可用 `TOPIC_WORKSPACE_DATE` 固定日期。
  - `.gitignore` 改为只忽略项目根目录 `/workspace/`，避免误伤 `src/lib/workspace` 和 `tests/workspace`。
- 修复新 topic 复用旧视频画面/旧主题模板的风险：
  - 物理：`motion-diagram` 只允许强圆周语义进入；普通力学公式如 `F=ma` 不再复用圆周轨迹图。
  - 物理光学：折射/入射/法线/介质等语义进入 `optics-ray` 光路图。
  - 数学：不再因为 `boardExpression` 像标题就强制进入公式板，只有真正公式表达才进入 `formula-board`。
  - 化学：不再因为存在 `reactionLine` / `particleLabels` 就强制进入粒子实验图，必须有真实反应语义或化学方程式特征才进入 `particle-lab`。
- 新增 `OpticsRayDiagram`：空气/水或玻璃界面、法线、入射光线、折射光线、入射角和折射角。
- mock draft provider 改为只从当前 `research` 数据生成脚本和 visualPlan，不再带集合、运动描述、物质分类等旧 topic 专用文案。
- subject adapter 改为当前 `canonicalTitle/sourceSummary` 驱动；fallback 文案不再写死旧主题。
- 公式板变量卡修复：对象型 `variableCards` 会显示为 `标签：含义`，不再出现 `[object Object]`。
- 新增/更新测试防回归：
  - 折射必须走 `optics-ray`。
  - 匀速圆周运动才走 `motion-diagram`。
  - 牛顿第二定律等普通力学公式不能进入圆周轨迹图。
  - 函数单调性等数学 topic 不能被标题式 `boardExpression` 强行送入公式板。
  - 物质分类等化学 topic 不能被 `reactionLine` 字段名强行送入粒子实验图。
  - mock draft 生成必须包含当前 topic 标题，且不能混入旧主题模板词。
- 修复测试验证稳定性：Vitest 关闭文件级并发，避免多个流水线测试同时写 `.vitest/workspace/topics` 下同名 topic manifest 导致 JSON 读写竞态。

# 关键文件

- `src/compositions/AutoVideoComposition.tsx`
- `src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx`
- `src/compositions/adaptiveMotion/selectVisualModule.ts`
- `src/compositions/adaptiveMotion/visualModules.tsx`
- `src/lib/providers/createDraftProvider.ts`
- `src/lib/rendering/subjectAdapter.ts`
- `src/lib/rendering/buildRenderPackage.ts`
- `src/lib/rendering/saveRenderPackage.ts`
- `src/lib/pipeline/runApprovedToRender.ts`
- `src/lib/workspace/getTopicWorkspace.ts`
- `tests/workspace/topicManifest.test.ts`
- `.gitignore`
- `tests/adaptiveMotion/selectVisualModule.test.ts`
- `tests/composition.test.tsx`
- `tests/draft/generateDraft.test.ts`
- `tests/rendering/subjectAdapterRegistry.test.ts`
- `vitest.config.ts`

# 运行入口

- 安装依赖：`npm install`
- 类型检查：`npm run lint:types`
- 全量测试：`npm test`
- 启动 Remotion Studio：`npm run dev`
- 诊断：`npm run cli -- doctor`
- 渲染已审核 topic：`npm run cli -- produce render --topic-id <topicId>`
- 使用 mock audio 预览：`npm run cli -- produce render --topic-id <topicId> --allow-mock-audio`
- 查看 topic 状态：`npm run cli -- topic status --topic-id <topicId>`

# 当前注意事项

- 新生成视频及相关流水线产物默认在 `workspace/videos/YYYY-M-D/NN/<topicId>/` 下，不再按旧的 `workspace/topics/<topicId>/` 作为默认目录。
- 新视频应从当前 topic 的 `research/draft/approved lesson/render package` 重新生成；不得读取、参考或套用旧 topic 的视频、截图、公式或主题文案。
- 底层组件和视觉模块可以复用，但进入模块的条件必须由当前 topic 语义和 payload 内容决定。
- `motion-diagram` 是圆周/向心类运动专用图，不是所有物理运动和公式的默认图。
- `particle-lab` 是反应/粒子变化图，不是所有化学 topic 的默认图。
- `formula-board` 只适合真实公式表达，不适合把普通标题当公式展示。
- 根目录 `workspace/` 和 `public/generated/` 是生成产物目录，已被 git 忽略。
- `--allow-mock-audio` 只适合画面链路验证；正式成片需要配置真实 TTS。
