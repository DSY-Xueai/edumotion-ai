# Repository Guidelines

## 环境检测与配置

在仓库根目录操作。开始制作前检查并补齐环境：

- 检查 Node.js 20+ LTS、npm 10+、Chrome/Edge；缺失时安装，项目依赖缺失时运行 `npm ci`。
- 检查 `ffmpeg`、`ffprobe`；缺失时安装，并确保当前进程能通过 PATH 调用。
- 按选定的配音方案安装依赖、配置服务地址及模型路径，验证实际配音可用。仅对无法自动获取的凭证或尚未确定的方案提问。
- 运行 `npm run cli -- doctor`，核对浏览器与实际生效的配音配置；不要仅凭 `ok: true` 判断环境齐全。

## 准备内容

1. 将输入整理为教学资料、讲解文案、分镜和字幕草稿。按需复用 `curriculum/` 中的课程和词库。
2. 阅读 `src/lib/research/schema.ts`、`src/lib/draft/schema.ts` 和 `src/lib/rendering/subjectAdapter.ts`，按 schema 生成数据，确保分镜、字幕引用有效的讲解片段，画面适配内容。
3. topicId 使用 `math-`、`physics-`、`chemistry-` 或 `english-` 前缀。新主题使用未占用的 ID，例如 `physics-custom-projectile-001`。其他学科先检查现有模板是否适用。
4. 调用 `src/lib/research/saveResearch.ts` 的 `saveResearch` 和 `src/lib/draft/saveDraft.ts` 的 `saveDraft` 保存内容；通过 `src/lib/workspace/writeTopicManifest.ts` 将状态设为 `pending_review`，`updatedAt` 使用 ISO 时间。使用 `getTopicWorkspace` 定位任务目录，不手工拼接日期和序号。

## 审核与渲染

在对话中展示文案和分镜，确认后批准；已有全流程或代审授权时直接执行。草稿变更后重新批准。

```bash
npm run cli -- review --topic-id <topic-id> --action approve --note "审核通过"
npm run cli -- produce render --topic-id <topic-id>
```

使用已验证可用的真实配音服务。`--allow-mock-audio` 仅用于明确要求的测试。

## 检查与交付

检查成品画面、配音和字幕。英语视频按 `docs/english-video-quality.md` 检查，并执行：

```bash
npm run cli -- quality english --topic-id <topic-id>
```

返回实际生成的 `render/video.mp4` 路径和检查结果，未执行的检查明确标注。不要仅凭命令退出成功宣称成品合格。
