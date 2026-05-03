# Adaptive Motion Visual Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default video visual flow with a Remotion-driven adaptive visual arranger for all subjects.

**Architecture:** `AutoVideoComposition` remains the production entry, but delegates scene visuals to a new adaptive MotionLab composition layer. The arranger chooses visual modules from scene subject, scene kind, payload fields, and caption length instead of forcing one fixed layout.

**Tech Stack:** React, Remotion, TypeScript, Vitest.

---

### Task 1: Lock Production Entry Behavior

**Files:**
- Modify: `tests/composition.test.tsx`

- [ ] Add a failing assertion that `AutoVideoComposition` renders MotionLab markers such as `data-motion-lab-subject` and `data-visual-module`.
- [ ] Run `npm test tests/composition.test.tsx` and verify it fails because the current composition still renders legacy subject scenes.

### Task 2: Add Adaptive MotionLab Renderer

**Files:**
- Create: `src/compositions/adaptiveMotion/AdaptiveMotionComposition.tsx`
- Create: `src/compositions/adaptiveMotion/visualModules.tsx`
- Create: `src/compositions/adaptiveMotion/selectVisualModule.ts`

- [ ] Implement a module selector that maps scene content to `concept-map`, `formula-board`, `process-flow`, `motion-diagram`, `particle-lab`, `compare-board`, or `hero-focus`.
- [ ] Implement reusable Remotion components driven by `useCurrentFrame()` and `interpolate()`.
- [ ] Keep layouts adaptive by module choice and content density, not by a fixed top/middle/bottom template.

### Task 3: Replace Default AutoVideo Visual Flow

**Files:**
- Modify: `src/compositions/AutoVideoComposition.tsx`
- Modify: `src/Root.tsx`

- [ ] Make `AutoVideoComposition` render `AdaptiveMotionComposition`.
- [ ] Keep audio track sequencing and subtitle timing behavior intact.
- [ ] Keep `CircularMotionPreview` as a comparison/development composition for now.

### Task 4: Verify and Document

**Files:**
- Modify: `Course.md`

- [ ] Run `npm run lint:types`.
- [ ] Run `npm test`.
- [ ] Render or still-check `AutoVideo` with the existing `physics-b2-ch6-topic-001` render package.
- [ ] Update `Course.md` with the new default visual pipeline and current caveats.
