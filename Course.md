# 项目状态

- 当前项目已完成第一版基础链路：`txt/md/docx + 可选图片 -> 标准 JSON -> Remotion 渲染 mp4`。
- 当前默认输出为竖屏 `1080x1920` 图文解说视频。
- 已支持连续文案自动切段、无图回退信息卡、CLI 一键渲染。
- 首版仍不包含 TTS、背景音乐、AI 生图、自动搜图。

# 本轮新增或变更

- 新增首版设计文档，确认采用“独立业务项目 + 标准 JSON 中间层”的方案。
- 新增首版实现计划文档，作为后续编码执行基线。
- 新增 Remotion TypeScript 工程脚手架、标准 JSON schema、解析器、normalizer、composition 和 CLI 渲染入口。
- 新增 `txt`、`md`、`docx` 三类输入夹具与自动化测试。
- 已完成真实渲染验证，可产出 `out/video-spec.json` 和 `out/demo.mp4`。
- 明确系统模块拆分为 `ingest`、`parser`、`normalizer`、`renderer`、`pipeline CLI`。
- 明确首版模板包含封面卡、图文卡、信息卡、结尾卡。
- 明确首版容错策略与验证标准。

# 关键文件

- `docs/superpowers/specs/2026-04-17-remotion-auto-video-design.md`：当前已确认的首版设计文档。
- `docs/superpowers/plans/2026-04-17-remotion-auto-video-v1.md`：第一版实现计划。
- `src/lib/ingest/readSourceFile.ts`：输入文件读取，支持 `txt`、`md`、`docx`。
- `src/lib/parser/parseArticle.ts`：连续文案切段与标题提取。
- `src/lib/normalizer/buildVideoSpec.ts`：标准 JSON scene 生成。
- `src/compositions/AutoVideoComposition.tsx`：Remotion 视频主组合。
- `src/cli/render.ts`：CLI 一键渲染入口。
- `README.md`：当前运行方式与命令说明。
- `.gitignore`：忽略本地可视化、依赖和渲染输出目录。

# 运行入口

- 安装依赖：`npm install`
- 运行测试：`npm test`
- 类型检查：`npm run lint:types`
- 启动 Remotion Studio：`npm run dev`
- 渲染视频：`npm run render -- <sourceFile> [outFile] [image1 image2 ...]`

# 当前注意事项

- 不建议直接改 `remotion-dev/remotion` 官方 monorepo，应新建独立业务项目。
- Remotion 渲染层只消费标准 JSON，不应直接依赖原始文案格式。
- 后续新能力应优先挂到 JSON 生成阶段，避免破坏模板层边界。
- 当前分支为 `feature/v1-auto-video`，后续测试应合并到 `test/v1-auto-video` 后验证。
