import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { RenderPackage, RenderPackageScene } from "../../lib/rendering/schema";
import type { VisualModule } from "./selectVisualModule";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export type SubjectStyle = {
  label: string;
  accent: string;
  secondary: string;
  background: string;
  ink: string;
};

export const subjectStyles: Record<RenderPackage["subject"], SubjectStyle> = {
  math: {
    label: "MATHEMATICS",
    accent: "#7aa7ff",
    secondary: "#f8d66d",
    background:
      "linear-gradient(180deg, #091a2f 0%, #10284a 48%, #172f4f 100%)",
    ink: "#eef6ff",
  },
  physics: {
    label: "PHYSICS LAB",
    accent: "#76f7d5",
    secondary: "#ffd166",
    background:
      "linear-gradient(180deg, #071b24 0%, #092a32 46%, #0d3a34 100%)",
    ink: "#ecfffa",
  },
  chemistry: {
    label: "CHEMISTRY LAB",
    accent: "#ffb38a",
    secondary: "#9be7ff",
    background:
      "linear-gradient(180deg, #24100b 0%, #442315 48%, #522d1c 100%)",
    ink: "#fff7f0",
  },
  english: {
    label: "ENGLISH VOCAB",
    accent: "#ff8d7a",
    secondary: "#efd96a",
    background:
      "linear-gradient(180deg, #081f31 0%, #0c3147 48%, #123b52 100%)",
    ink: "#f6fbff",
  },
};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];

const asDisplayArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item && typeof item === "object") {
            const record = item as Record<string, unknown>;
            const label = asString(record.label);
            const meaning = asString(record.meaning);

            if (label && meaning) {
              return `${label}：${meaning}`;
            }

            return label || meaning;
          }

          return String(item);
        })
        .filter(Boolean)
    : [];

const asWordChunks = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];

const panel = (style: SubjectStyle): CSSProperties => ({
  borderRadius: 28,
  background: "rgba(7, 18, 25, 0.68)",
  outline: `1px solid ${style.accent}44`,
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.34)",
});

const revealValue = (frame: number, delay = 0) =>
  interpolate(frame, [delay, delay + 20], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const StaggeredCard = ({
  children,
  index,
  style,
}: {
  children: ReactNode;
  index: number;
  style: SubjectStyle;
}) => {
  const frame = useCurrentFrame();
  const reveal = revealValue(frame, 5 + index * 5);
  const y = interpolate(reveal, [0, 1], [18, 0], clamp);

  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.08)",
        outline: "1px solid rgba(255,255,255,0.08)",
        color: style.ink,
        fontSize: 28,
        lineHeight: 1.34,
        opacity: reveal,
        transform: `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const SubjectBadge = ({
  scene,
  style,
  title,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
  title: string;
}) => {
  const frame = useCurrentFrame();
  const reveal = revealValue(frame);
  const sceneLabel = asString(scene.payload.sceneLabel, scene.kind);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 24,
        alignItems: "flex-start",
        opacity: reveal,
      }}
    >
      <div>
        <div style={{ color: style.accent, fontSize: 24, fontWeight: 800 }}>
          {style.label}
        </div>
        <div style={{ marginTop: 10, fontSize: 64, fontWeight: 900, lineHeight: 1.06 }}>
          {title}
        </div>
      </div>
      <div
        style={{
          minWidth: 138,
          minHeight: 138,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          padding: 18,
          background: `${style.accent}18`,
          outline: `1px solid ${style.accent}55`,
          color: style.accent,
          fontSize: 30,
          fontWeight: 900,
          textAlign: "center",
        }}
      >
        {sceneLabel}
      </div>
    </div>
  );
};

export const HeroFocus = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const narration = asString(scene.payload.narration);

  return (
    <div
      style={{
        ...panel(style),
        padding: "46px 42px",
        display: "grid",
        alignContent: "center",
        minHeight: 690,
      }}
    >
      <div style={{ color: style.accent, fontSize: 28, fontWeight: 800 }}>核心问题</div>
      <div style={{ marginTop: 26, color: style.ink, fontSize: 48, fontWeight: 900, lineHeight: 1.28 }}>
        {narration}
      </div>
    </div>
  );
};

export const ConceptMap = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const points = [
    ...asStringArray(scene.payload.keyPoints),
    ...asStringArray(scene.payload.exampleChips),
  ];
  const fallback = asString(scene.payload.narration);
  const items = points.length > 0 ? points.slice(0, 5) : [fallback];

  return (
    <div style={{ ...panel(style), padding: 34, minHeight: 720 }}>
      <div style={{ color: style.accent, fontSize: 28, fontWeight: 900 }}>结构关系</div>
      <div style={{ marginTop: 28, display: "grid", gap: 18 }}>
        {items.map((item, index) => (
          <StaggeredCard key={`${scene.id}-concept-${index}`} index={index} style={style}>
            <span style={{ color: style.secondary, fontWeight: 900 }}>0{index + 1}</span>
            <span style={{ marginLeft: 18 }}>{item}</span>
          </StaggeredCard>
        ))}
      </div>
    </div>
  );
};

export const FormulaBoard = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const expression =
    asString(scene.payload.boardExpression) || asString(scene.payload.lawCard) || asString(scene.payload.narration);
  const cards = asDisplayArray(scene.payload.variableCards).length
    ? asDisplayArray(scene.payload.variableCards)
    : asDisplayArray(scene.payload.keyPoints);

  return (
    <div style={{ ...panel(style), padding: 36, minHeight: 720 }}>
      <div style={{ color: style.accent, fontSize: 28, fontWeight: 900 }}>公式与变量</div>
      <div
        style={{
          marginTop: 32,
          padding: "36px 30px",
          borderRadius: 28,
          background: "rgba(255,255,255,0.09)",
          color: "#ffffff",
          fontSize: expression.length > 28 ? 42 : 58,
          fontWeight: 900,
          lineHeight: 1.18,
        }}
      >
        {expression}
      </div>
      <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {cards.slice(0, 4).map((item, index) => (
          <StaggeredCard key={`${scene.id}-formula-${index}`} index={index} style={style}>
            {typeof item === "string" ? item : JSON.stringify(item)}
          </StaggeredCard>
        ))}
      </div>
    </div>
  );
};

export const ProcessFlow = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const steps = [
    ...asStringArray(scene.payload.processSteps),
    ...asStringArray(scene.payload.labNotes),
  ];
  const items = steps.length > 0 ? steps.slice(0, 4) : [asString(scene.payload.narration)];

  return (
    <div style={{ ...panel(style), padding: 36, minHeight: 720 }}>
      <div style={{ color: style.accent, fontSize: 28, fontWeight: 900 }}>过程编排</div>
      <div style={{ marginTop: 32, display: "grid", gap: 20 }}>
        {items.map((step, index) => (
          <div
            key={`${scene.id}-process-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "62px 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                background: style.accent,
                color: "#06131a",
                display: "grid",
                placeItems: "center",
                fontSize: 25,
                fontWeight: 900,
              }}
            >
              {index + 1}
            </div>
            <StaggeredCard index={index} style={style}>
              {step}
            </StaggeredCard>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CompareBoard = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const focus =
    asString(scene.payload.misconceptionNote) ||
    asString(scene.payload.compareFocus) ||
    asString(scene.payload.narration);

  return (
    <div style={{ ...panel(style), padding: 40, minHeight: 720 }}>
      <div style={{ color: style.secondary, fontSize: 28, fontWeight: 900 }}>易错对比</div>
      <div
        style={{
          marginTop: 30,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <div style={{ padding: 28, borderRadius: 26, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ color: style.secondary, fontSize: 24, fontWeight: 900 }}>容易误解</div>
          <div style={{ marginTop: 18, fontSize: 34, lineHeight: 1.35, fontWeight: 800 }}>
            {focus}
          </div>
        </div>
        <div style={{ padding: 28, borderRadius: 26, background: `${style.accent}18` }}>
          <div style={{ color: style.accent, fontSize: 24, fontWeight: 900 }}>正确抓手</div>
          <div style={{ marginTop: 18, fontSize: 34, lineHeight: 1.35, fontWeight: 800 }}>
            {asString(scene.payload.observationNote, asString(scene.payload.narration))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const VocabularyCard = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const word = asString(scene.payload.word, asString(scene.payload.title));
  const meaning = asString(scene.payload.meaning);

  return (
    <div
      style={{
        ...panel(style),
        padding: 44,
        minHeight: 760,
        display: "grid",
        gridTemplateRows: "1fr auto",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: 560,
        }}
      >
        <div
          style={{
            textAlign: "center",
            display: "grid",
            gap: 20,
            justifyItems: "center",
          }}
        >
          <div
            style={{
              color: style.ink,
              fontSize: word.length > 9 ? 88 : 108,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: 0,
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            {word}
          </div>
          <div
            style={{
              color: style.secondary,
              fontSize: meaning.length > 20 ? 30 : 36,
              fontWeight: 850,
              lineHeight: 1.34,
              maxWidth: "82%",
              textAlign: "center",
            }}
          >
            {meaning}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MotionDiagram = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const frame = useCurrentFrame();
  const angle = (frame / 90) * Math.PI * 2 - Math.PI / 2;
  const radius = 210;
  const center = 330;
  const x = center + Math.cos(angle) * radius;
  const y = center + Math.sin(angle) * radius;
  const law = asString(scene.payload.lawCard, asString(scene.payload.narration));

  return (
    <div style={{ ...panel(style), padding: 28, minHeight: 760 }}>
      <div style={{ color: style.accent, fontSize: 28, fontWeight: 900 }}>动态示意</div>
      <svg width="100%" height="560" viewBox="0 0 660 560" style={{ marginTop: 18 }}>
        <defs>
          <marker id="motion-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={style.accent} />
          </marker>
        </defs>
        <circle cx={center} cy={center - 10} r={radius} fill="none" stroke={style.accent} strokeWidth="5" strokeDasharray="18 14" opacity="0.68" />
        <line x1={x} y1={y - 10} x2={center} y2={center - 10} stroke={style.secondary} strokeWidth="9" strokeLinecap="round" markerEnd="url(#motion-arrow)" />
        <circle cx={x} cy={y - 10} r="27" fill="#ffffff" />
        <circle cx={x} cy={y - 10} r="15" fill="#06131a" />
        <circle cx={center} cy={center - 10} r="11" fill={style.secondary} />
      </svg>
      <div style={{ padding: "22px 24px", borderRadius: 24, background: "rgba(255,255,255,0.08)", fontSize: 40, fontWeight: 900 }}>
        {law}
      </div>
    </div>
  );
};

export const OpticsRayDiagram = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const frame = useCurrentFrame();
  const reveal = revealValue(frame, 4);
  const law = asString(scene.payload.lawCard, "n1 sin i = n2 sin r");
  const note = asString(scene.payload.observationNote, asString(scene.payload.narration));
  const incidentEnd = interpolate(reveal, [0, 1], [150, 315], clamp);
  const refractedEnd = interpolate(reveal, [0, 1], [365, 525], clamp);

  return (
    <div style={{ ...panel(style), padding: 28, minHeight: 760 }}>
      <div style={{ color: style.accent, fontSize: 28, fontWeight: 900 }}>光路折射</div>
      <svg width="100%" height="560" viewBox="0 0 660 560" style={{ marginTop: 18 }}>
        <defs>
          <marker
            id="optics-arrow"
            markerWidth="18"
            markerHeight="18"
            refX="16"
            refY="9"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 18 9 L 0 18 z" fill={style.accent} />
          </marker>
        </defs>
        <rect x="42" y="54" width="576" height="216" rx="30" fill="rgba(255,255,255,0.07)" />
        <rect x="42" y="270" width="576" height="226" rx="30" fill={`${style.accent}20`} />
        <line x1="54" y1="270" x2="606" y2="270" stroke="#ffffff" strokeWidth="5" opacity="0.82" />
        <line x1="330" y1="62" x2="330" y2="496" stroke={style.secondary} strokeWidth="4" strokeDasharray="13 12" opacity="0.95" />
        <line x1="150" y1="86" x2={incidentEnd} y2="270" stroke={style.secondary} strokeWidth="10" strokeLinecap="round" markerEnd="url(#optics-arrow)" />
        <line x1="330" y1="270" x2={refractedEnd} y2="456" stroke={style.accent} strokeWidth="10" strokeLinecap="round" markerEnd="url(#optics-arrow)" />
        <circle cx="330" cy="270" r="15" fill="#ffffff" />
        <path d="M 330 206 A 64 64 0 0 0 282 228" fill="none" stroke={style.secondary} strokeWidth="4" />
        <path d="M 330 334 A 64 64 0 0 1 376 314" fill="none" stroke={style.accent} strokeWidth="4" />
        <text x="66" y="104" fill="#ffffff" fontSize="30" fontWeight="900">空气</text>
        <text x="66" y="326" fill="#ffffff" fontSize="30" fontWeight="900">水 / 玻璃</text>
        <text x="346" y="150" fill={style.secondary} fontSize="24" fontWeight="900">法线</text>
        <text x="158" y="154" fill={style.secondary} fontSize="26" fontWeight="900">入射光线</text>
        <text x="430" y="388" fill={style.accent} fontSize="26" fontWeight="900">折射光线</text>
        <text x="254" y="224" fill="#ffffff" fontSize="22" fontWeight="900">i</text>
        <text x="384" y="338" fill="#ffffff" fontSize="22" fontWeight="900">r</text>
      </svg>
      <div style={{ padding: "20px 24px", borderRadius: 24, background: "rgba(255,255,255,0.08)", fontSize: 36, fontWeight: 900 }}>
        {law}
      </div>
      <div style={{ marginTop: 14, color: style.ink, opacity: 0.86, fontSize: 25, lineHeight: 1.32 }}>
        {note}
      </div>
    </div>
  );
};

export const ReflectionRayDiagram = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const frame = useCurrentFrame();
  const reveal = revealValue(frame, 4);
  const law = asString(scene.payload.lawCard, "∠i = ∠r");
  const note = asString(scene.payload.observationNote, asString(scene.payload.narration));
  const incidentEnd = interpolate(reveal, [0, 1], [150, 315], clamp);
  const reflectedEnd = interpolate(reveal, [0, 1], [315, 510], clamp);

  return (
    <div style={{ ...panel(style), padding: 28, minHeight: 760 }}>
      <div style={{ color: style.accent, fontSize: 28, fontWeight: 900 }}>光的反射</div>
      <svg width="100%" height="560" viewBox="0 0 660 560" style={{ marginTop: 18 }}>
        <defs>
          <marker
            id="reflection-arrow"
            markerWidth="18"
            markerHeight="18"
            refX="16"
            refY="9"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 18 9 L 0 18 z" fill={style.accent} />
          </marker>
        </defs>
        <rect x="42" y="270" width="576" height="10" rx="5" fill="#ffffff" opacity="0.92" />
        <line
          x1="330"
          y1="72"
          x2="330"
          y2="492"
          stroke={style.secondary}
          strokeWidth="4"
          strokeDasharray="13 12"
          opacity="0.95"
        />
        <line
          x1="150"
          y1="112"
          x2={incidentEnd}
          y2="270"
          stroke={style.secondary}
          strokeWidth="10"
          strokeLinecap="round"
          markerEnd="url(#reflection-arrow)"
        />
        <line
          x1="330"
          y1="270"
          x2={reflectedEnd}
          y2="112"
          stroke={style.accent}
          strokeWidth="10"
          strokeLinecap="round"
          markerEnd="url(#reflection-arrow)"
        />
        <circle cx="330" cy="270" r="15" fill="#ffffff" />
        <path d="M 330 210 A 64 64 0 0 0 282 230" fill="none" stroke={style.secondary} strokeWidth="4" />
        <path d="M 330 330 A 64 64 0 0 1 378 310" fill="none" stroke={style.accent} strokeWidth="4" />
        <text x="66" y="106" fill="#ffffff" fontSize="30" fontWeight="900">
          空气
        </text>
        <text x="346" y="156" fill={style.secondary} fontSize="24" fontWeight="900">
          法线
        </text>
        <text x="156" y="162" fill={style.secondary} fontSize="26" fontWeight="900">
          入射光线
        </text>
        <text x="418" y="152" fill={style.accent} fontSize="26" fontWeight="900">
          反射光线
        </text>
        <text x="250" y="224" fill="#ffffff" fontSize="22" fontWeight="900">
          i
        </text>
        <text x="390" y="228" fill="#ffffff" fontSize="22" fontWeight="900">
          r
        </text>
      </svg>
      <div style={{ padding: "20px 24px", borderRadius: 24, background: "rgba(255,255,255,0.08)", fontSize: 36, fontWeight: 900 }}>
        {law}
      </div>
      <div style={{ marginTop: 14, color: style.ink, opacity: 0.86, fontSize: 25, lineHeight: 1.32 }}>
        {note}
      </div>
    </div>
  );
};

export const ParticleLab = ({
  scene,
  style,
}: {
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  const frame = useCurrentFrame();
  const labels = asStringArray(scene.payload.particleLabels);
  const reaction = asString(scene.payload.reactionLine, asString(scene.payload.narration));

  return (
    <div style={{ ...panel(style), padding: 34, minHeight: 740 }}>
      <div style={{ color: style.accent, fontSize: 28, fontWeight: 900 }}>微观实验</div>
      <div style={{ position: "relative", height: 380, marginTop: 24 }}>
        {Array.from({ length: 12 }).map((_, index) => {
          const x = 70 + ((index * 83 + frame * (index % 2 ? 1.4 : -1.2)) % 780);
          const y = 70 + ((index * 47 + frame * 0.8) % 240);
          return (
            <div
              key={`${scene.id}-particle-${index}`}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 42,
                height: 42,
                borderRadius: 999,
                background: index % 2 ? style.accent : style.secondary,
                boxShadow: `0 0 30px ${index % 2 ? style.accent : style.secondary}`,
              }}
            />
          );
        })}
      </div>
      <div style={{ padding: "24px 26px", borderRadius: 24, background: "rgba(255,255,255,0.08)", fontSize: 38, fontWeight: 900, lineHeight: 1.22 }}>
        {reaction}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
        {labels.slice(0, 3).map((label, index) => (
          <div key={label} style={{ flex: 1 }}>
            <StaggeredCard index={index} style={style}>
              {label}
            </StaggeredCard>
          </div>
        ))}
      </div>
    </div>
  );
};

export const renderVisualModule = ({
  module,
  scene,
  style,
}: {
  module: VisualModule;
  scene: RenderPackageScene;
  style: SubjectStyle;
}) => {
  if (module === "concept-map") {
    return <ConceptMap scene={scene} style={style} />;
  }
  if (module === "formula-board") {
    return <FormulaBoard scene={scene} style={style} />;
  }
  if (module === "process-flow") {
    return <ProcessFlow scene={scene} style={style} />;
  }
  if (module === "compare-board") {
    return <CompareBoard scene={scene} style={style} />;
  }
  if (module === "vocabulary-card") {
    return <VocabularyCard scene={scene} style={style} />;
  }
  if (module === "reflection-ray") {
    return <ReflectionRayDiagram scene={scene} style={style} />;
  }
  if (module === "motion-diagram") {
    return <MotionDiagram scene={scene} style={style} />;
  }
  if (module === "optics-ray") {
    return <OpticsRayDiagram scene={scene} style={style} />;
  }
  if (module === "particle-lab") {
    return <ParticleLab scene={scene} style={style} />;
  }

  return <HeroFocus scene={scene} style={style} />;
};
