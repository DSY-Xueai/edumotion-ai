import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderPackage, RenderPackageScene } from "../../lib/rendering/schema";
import { selectVisualModule } from "./selectVisualModule";
import { SubjectBadge, renderVisualModule, subjectStyles } from "./visualModules";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const sceneLabelMap: Record<string, string> = {
  hook: "问题",
  definition: "定义",
  rule: "规律",
  compare: "对比",
  process: "过程",
  graph: "图像",
  pitfall: "易错",
  wrap: "总结",
};

const splitCaption = (text: string) => {
  if (text.length <= 28) {
    return [text];
  }

  const middle = Math.ceil(text.length / 2);
  const splitAt =
    ["。", "，", "；", "？", "！"]
      .map((mark) => text.indexOf(mark, Math.max(0, middle - 8)))
      .filter((index) => index > 8 && index < text.length - 8)
      .sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0] ?? middle;

  return [text.slice(0, splitAt + 1), text.slice(splitAt + 1)];
};

const getSceneStarts = (scenes: RenderPackageScene[]) => {
  let start = 0;

  return scenes.map((scene) => {
    const current = start;
    start += scene.durationInFrames;
    return current;
  });
};

const CaptionStage = ({
  cueId,
  text,
  durationInFrames,
}: {
  cueId?: string;
  text: string;
  durationInFrames: number;
}) => {
  const frame = useCurrentFrame();
  const lines = splitCaption(text);
  const enter = interpolate(frame, [0, 14], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exit = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp);
  const opacity = Math.min(enter, exit);

  return (
    <div
      data-cue-id={cueId}
      style={{
        position: "absolute",
        left: 58,
        right: 58,
        bottom: 116,
        padding: "28px 34px",
        borderRadius: 30,
        background: "rgba(2, 11, 15, 0.76)",
        outline: "1px solid rgba(255,255,255,0.13)",
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.45)",
        opacity,
      }}
    >
      {lines.map((line) => (
        <div
          key={line}
          style={{
            color: "#ffffff",
            fontSize: line.length > 32 ? 33 : 38,
            lineHeight: 1.36,
            fontWeight: 850,
            textAlign: "center",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

const AdaptiveScene = ({
  renderPackage,
  scene,
  sceneStartFrame,
}: {
  renderPackage: RenderPackage;
  scene: RenderPackageScene;
  sceneStartFrame: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = subjectStyles[renderPackage.subject];
  const module = selectVisualModule({
    subject: renderPackage.subject,
    scene,
  });
  const currentMs = ((frame + sceneStartFrame) / fps) * 1000;
  const cue = renderPackage.subtitleTrack.cues.find(
    (item) => currentMs >= item.startMs && currentMs < item.endMs,
  );
  const captionText = cue?.text ?? String(scene.payload.narration ?? "");
  const progress = interpolate(
    frame + sceneStartFrame,
    [0, Math.max(1, renderPackage.durationInFrames)],
    [0, 1],
    clamp,
  );
  const sceneTitle = renderPackage.canonicalTitle;
  const label = sceneLabelMap[scene.kind] ?? scene.kind;

  return (
    <AbsoluteFill
      data-motion-lab-subject={renderPackage.subject}
      data-visual-module={module}
      style={{
        background: style.background,
        color: style.ink,
        fontFamily: "'Microsoft YaHei', 'Trebuchet MS', Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 22% 14%, ${style.accent}28, transparent 34%), radial-gradient(circle at 82% 72%, ${style.secondary}22, transparent 36%)`,
        }}
      />
      <div style={{ position: "absolute", left: 58, right: 58, top: 56 }}>
        <SubjectBadge
          scene={{
            ...scene,
            payload: {
              ...scene.payload,
              sceneLabel: String(scene.payload.sceneLabel ?? label),
            },
          }}
          style={style}
          title={sceneTitle}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 58,
          right: 58,
          top: 258,
        }}
      >
        {renderVisualModule({ module, scene, style })}
      </div>
      <CaptionStage
        cueId={cue?.id}
        text={captionText}
        durationInFrames={scene.durationInFrames}
      />
      <div
        style={{
          position: "absolute",
          left: 58,
          right: 58,
          bottom: 54,
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${style.accent}, ${style.secondary})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const AdaptiveMotionComposition = (props: RenderPackage) => {
  const { fps } = useVideoConfig();
  const starts = getSceneStarts(props.scenes);

  return (
    <AbsoluteFill>
      {props.audioTracks.map((track) => (
        <Sequence
          key={track.id}
          from={Math.round((track.startMs / 1000) * fps)}
          durationInFrames={Math.max(1, Math.round((track.durationMs / 1000) * fps))}
          premountFor={fps}
        >
          <Audio src={staticFile(track.file)} />
        </Sequence>
      ))}
      {props.scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={starts[index]}
          durationInFrames={scene.durationInFrames}
          premountFor={fps}
        >
          <AdaptiveScene
            renderPackage={props}
            scene={scene}
            sceneStartFrame={starts[index]}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
