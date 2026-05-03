# 高中数理化教材知识点动画视频生产系统设计

## 1. 项目目标

本项目要做的不是通用“输入一段文章生成短视频”的工具，而是围绕 `人教版新教材` 运行的高中数学、物理、化学知识点动画视频生产系统。

系统以 `一个知识点 = 一条 60-90 秒视频` 为最小生产单元，沿教材目录顺序持续生产整套课程视频。

目标链路为：

`topic -> research -> draft -> review -> TTS -> subtitle -> Remotion render -> mp4`

第一版产品形态以 `CLI / 本地命令行` 为主，不先做 Web 工作台。

## 2. 总体原则

- 课程主线固定为 `人教版新教材` 的高中数学、物理、化学。
- 内容生产必须围绕教材知识点顺序推进，而不是自由输入文章。
- research、draft、review、audio、subtitle、render 必须分层。
- Remotion 只消费结构化渲染对象，不承担知识研究和教学脚本生成。
- 所有联网 research 结果必须保留来源链。
- 每个 topic 必须可追踪状态、可断点续跑、可局部重试。
- 三个科目不能共用同一套画面系统，但必须共用同一套生产内核。

## 3. 核心架构

系统拆成两层：

### 3.1 Shared Production Kernel

这一层是三科共用的生产内核，负责：

- curriculum/topic 定位
- workspace/topic manifest
- research schema 与来源链
- draft schema 与 review schema
- approved lesson 冻结
- TTS 生成与真实时长回填
- subtitle cue 对齐
- render package 总协议
- CLI / pipeline / batch / resume / doctor

它解决的是“如何稳定生产”。

### 3.2 Subject Visual Systems

数学、物理、化学各自拥有独立视觉系统：

- `math`
- `physics`
- `chemistry`

每科独立维护：

- scene grammar
- visual tokens
- motion primitives
- subject-specific scene mapper
- subject-specific Remotion scenes
- visual planning rules

它解决的是“如何把该科目讲清楚并讲得好看”。

## 4. 为什么不能做一个通用画面系统

三个科目虽然都属于 STEM，但教学表达结构差异很大：

- 数学更强调定义、条件、符号、图像、推导、反例
- 物理更强调情境、受力、过程、变量关系、实验感
- 化学更强调微观粒子、反应过程、条件变化、结构与性质

如果一开始强行共享一套画面系统，短期看实现快，长期会出现：

- 三科都被做平
- 分镜语法过度抽象
- scene contract 不断被打补丁
- 后期新增科目能力时返工严重

因此最终决策是：

- 共用生产内核
- 三科独立视觉系统

## 5. 共享数据对象链

整个系统统一使用以下对象链：

### 5.1 CurriculumNode

表示教材目录中的 topic 节点，至少包含：

- `id`
- `subject`
- `edition`
- `volume`
- `chapter`
- `section`
- `title`
- `nodeType`
- `parentId`
- `prevTopicId`
- `nextTopicId`
- `orderIndex`

### 5.2 KnowledgeResearch

表示知识点 research 结果，至少包含：

- `topicId`
- `canonicalTitle`
- `scope`
- `definitions`
- `formulas`
- `principles`
- `examples`
- `misconceptions`
- `prerequisites`
- `nextConnections`
- `visualizationHints`
- `sources`

`sources` 至少包含：

- `title`
- `url`
- `sourceType`
- `publisher`
- `retrievedAt`
- `quoteOrSummary`

### 5.3 LessonDraft

表示待审核课程草案，至少包含：

- `topicId`
- `subject`
- `toneProfile`
- `durationTargetSec`
- `hook`
- `summary`
- `scriptSegments`
- `storyboardScenes`
- `subtitleDraft`
- `visualPlan`
- `qaNotes`

这里要特别明确：

- `scriptSegments` 负责“讲什么”
- `storyboardScenes` 负责“怎么呈现”

### 5.4 ApprovedLesson

表示审核通过后的冻结版本，至少包含：

- `topicId`
- `subject`
- `version`
- `approvedAt`
- `reviewNotes`
- `approvedScript`
- `approvedStoryboard`
- `sourceSummary`

### 5.5 AudioManifest

表示真实 TTS 结果，至少包含：

- `topicId`
- `voice`
- `segments`
- `totalDurationMs`

每个 segment 至少包含：

- `segmentId`
- `audioFile`
- `durationMs`
- `chunks`

### 5.6 SubtitleTrack

表示最终字幕轨道，至少包含：

- `topicId`
- `subject`
- `cues`

每个 cue 至少包含：

- `id`
- `text`
- `startMs`
- `endMs`

### 5.7 RenderPackage

表示 Remotion 最终消费对象，至少包含：

- `meta`
- `subject`
- `themeTokens`
- `audioTracks`
- `subtitleTrack`
- `scenes`
- `durationInFrames`

## 6. Subject Adapter 机制

三个科目虽然独立深做，但不能各自发明一套系统。必须统一通过 `subject adapter` 接入共享内核。

每个 subject adapter 至少负责：

- 从 `KnowledgeResearch` + `LessonDraft` 生成该科目的 `storyboardScenes`
- 从 `ApprovedLesson` + `AudioManifest` + `SubtitleTrack` 生成该科目的 `RenderPackage.scenes`
- 输出本学科的 `themeTokens`
- 把中性 scene 语义映射成该科目的 Remotion 组件参数

也就是说：

- 内核生产的是“教学对象”
- adapter 把教学对象翻译成“该科目的视觉对象”

## 7. 三科独立视觉系统要求

### 7.1 数学

数学视觉系统重点覆盖：

- 定义拆解
- 符号强调
- 条件与结论
- 图像关系
- 推导过程
- 反例与误区

建议 scene grammar 至少覆盖：

- `hook`
- `definition`
- `rule`
- `compare`
- `graph`
- `pitfall`
- `wrap`

### 7.2 物理

物理视觉系统重点覆盖：

- 物理情境
- 变量关系
- 力与运动
- 实验过程
- 因果链条
- 图示与过程变化

建议 scene grammar 至少覆盖：

- `hook`
- `phenomenon`
- `model`
- `process`
- `equation`
- `experiment`
- `pitfall`
- `wrap`

### 7.3 化学

化学视觉系统重点覆盖：

- 微观粒子视角
- 结构与性质
- 条件变化
- 反应过程
- 宏观现象与微观解释
- 反应式与步骤

建议 scene grammar 至少覆盖：

- `hook`
- `observation`
- `micro-view`
- `reaction`
- `structure`
- `condition`
- `pitfall`
- `wrap`

## 8. 目录结构

目录从一开始就按最终系统形态建设：

```text
curriculum/
  pep-2019/
    math/
    physics/
    chemistry/

workspace/
  topics/<topic-id>/
    manifest/
    research/
    draft/
    approved/
    audio/
    subtitle/
    render/

src/lib/
  curriculum/
  workspace/
  research/
  draft/
  review/
  audio/
  subtitle/
  rendering/
  providers/
  pipeline/

src/subjects/
  math/
  physics/
  chemistry/
```

这里最重要的约束是：

- `src/lib/` 只放共享内核
- `src/subjects/` 只放学科差异化视觉系统

## 9. 正式成片链路

正式成片必须走以下路径：

### 9.1 topic 定位

从 curriculum 中定位一个教材知识点。

### 9.2 research

使用真实模型和真实联网来源生成 `KnowledgeResearch`，保留来源链。

### 9.3 draft

使用真实模型生成：

- 口播脚本
- 教学分镜草案
- 字幕草案
- 视觉计划

### 9.4 review

允许人工审核：

- 通过
- 重生成全部
- 重生成脚本
- 重生成分镜
- 手动修订后通过

### 9.5 TTS

使用真实 TTS provider 生成分段音频，并获得真实时长和 chunk timing。

### 9.6 subtitle

基于真实音频时间生成最终 `SubtitleTrack`。

### 9.7 render package

通过对应 subject adapter 生成学科专属 `RenderPackage`。

### 9.8 Remotion render

Remotion 只负责消费 `RenderPackage`，输出最终 mp4。

## 10. Timing 原则

系统必须采用 `audio-led timing`：

1. 先确定审核通过的脚本
2. 再生成真实 TTS 音频
3. 再生成字幕时间轴
4. 最后驱动画面节奏

不允许继续沿用旧原型里“按文本长度估时”的做法作为正式方案。

## 11. 第一阶段目标

第一阶段不是把整套平台一次做完，而是优先解决“正式样片质量太差”的核心问题。

第一阶段必须交付：

- 共享生产内核的正式主链路
- 三科独立视觉系统的正式骨架
- 数学 / 物理 / 化学三条正式样片
- 真实模型与真实 TTS 接入
- 真实字幕与音画时序对齐

第一阶段暂不优先：

- 大规模 batch 优化
- 完整 doctor / 运维体系
- 全教材目录一次性补齐
- Web UI 工作台

## 12. 实现顺序

推荐顺序是：

1. 先收紧共享内核契约
2. 再并发深做三科视觉系统
3. 统一集成三科正式样片
4. 再继续补 review / batch / resume / doctor / e2e
5. 最终收口为完整可持续生产系统

不推荐的顺序是：

- 一开始就让三科完全独立从零开发

那样会导致接口分叉和严重返工。

## 13. 并发策略

并发开发是可行的，但必须在共享内核收紧之后进行。

推荐并发方式：

- 主线程先完成 shared kernel contracts
- 然后并发拆成三个学科 worker：
  - `math visual system`
  - `physics visual system`
  - `chemistry visual system`

每个 worker 只负责各自学科目录，不修改共享 schema 定义。

## 14. 风险与策略

### 14.1 三科视觉系统互相污染

风险：

- 为了图快，把数学表达硬套到物理和化学

策略：

- 三科场景、token、motion、组件彻底分目录
- 只共享内核，不共享最终视觉系统

### 14.2 数据契约分叉

风险：

- 三科并发开发时各自补字段，最终 render package 不兼容

策略：

- 先冻结共享 schema
- subject adapter 只能在共享 schema 之内做翻译

### 14.3 音画节奏失配

风险：

- 先画面后配音，或按文字估算镜头长度

策略：

- 全部切到 audio-led timing
- 字幕和镜头时长以真实 TTS 为准

### 14.4 过早追求平台完备

风险：

- 在正式样片质量未达标前，把时间投入到 batch、doctor、运维细节

策略：

- 第一阶段先打高正式样片
- 平台完善放到样片质量过关后继续推进

## 15. 下一步

本设计确认后，下一步不是继续讨论方向，而是按该设计写实现计划，并开始执行：

- 先补齐 shared kernel
- 再并发推进三科视觉系统
- 产出三条正式样片
- 然后继续推进到整项目真正完成
