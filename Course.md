# 项目状态

- 当前项目刚初始化 git，尚未开始编码实现。
- 已确定首版方向：基于 Remotion 自动生成竖屏 `1080x1920` 图文解说视频。
- 已确定首版输入：`txt`、`md`、`docx` 连续文案，外加可选图片。
- 已确定首版输出：先将输入自动转换为标准 JSON，再通过 Remotion 渲染 `mp4`。
- 首版不包含 TTS、背景音乐、AI 生图、自动搜图。

# 本轮新增或变更

- 新增首版设计文档，确认采用“独立业务项目 + 标准 JSON 中间层”的方案。
- 新增首版实现计划文档，作为后续编码执行基线。
- 明确系统模块拆分为 `ingest`、`parser`、`normalizer`、`renderer`、`pipeline CLI`。
- 明确首版模板包含封面卡、图文卡、信息卡、结尾卡。
- 明确首版容错策略与验证标准。

# 关键文件

- `docs/superpowers/specs/2026-04-17-remotion-auto-video-design.md`：当前已确认的首版设计文档。
- `docs/superpowers/plans/2026-04-17-remotion-auto-video-v1.md`：第一版实现计划。
- `.gitignore`：忽略本地可视化草图等临时目录。

# 运行入口

- 当前尚未创建 Remotion 工程与 CLI 入口。
- 下一步应按实现计划创建功能分支并开始脚手架与代码落地。

# 当前注意事项

- 不建议直接改 `remotion-dev/remotion` 官方 monorepo，应新建独立业务项目。
- Remotion 渲染层只消费标准 JSON，不应直接依赖原始文案格式。
- 后续新能力应优先挂到 JSON 生成阶段，避免破坏模板层边界。
