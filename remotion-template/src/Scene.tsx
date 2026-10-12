import {
  AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import type { Scene, Timeline } from "./types";
import { FONT_SANS } from "./util";

const src = (p: string) => (/^https?:\/\//.test(p) ? p : staticFile(p));

export const SceneView: React.FC<{ scene: Scene; timeline: Timeline; speechFrom: number }> = ({
  scene, timeline, speechFrom,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const accent = scene.accent ?? timeline.accent ?? "#28e0c8";
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const layout = scene.layout ?? (scene.image ? "image" : "text");

  return (
    <AbsoluteFill style={{ backgroundColor: scene.bg ?? timeline.bg ?? "#0f1115", opacity: fadeOut }}>
      {layout === "image" && scene.image ? (
        <AbsoluteFill>
          <Img src={src(scene.image)} style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${interpolate(frame, [0, durationInFrames], [1, 1.12])})`,
          }} />
          <AbsoluteFill style={{ background: "linear-gradient(transparent 40%, rgba(0,0,0,.75))" }} />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{
        justifyContent: layout === "title" ? "center" : "flex-start",
        alignItems: "center", padding: "18% 8% 0", fontFamily: FONT_SANS,
      }}>
        {scene.title ? (
          <div style={{
            color: "white", fontWeight: 800, textAlign: "center",
            fontSize: layout === "title" ? 110 : 76, lineHeight: 1.1,
            transform: `translateY(${(1 - enter) * 60}px)`, opacity: enter,
          }}>
            {scene.title}
            <div style={{
              height: 10, background: accent, borderRadius: 5, margin: "28px auto 0",
              width: `${enter * 40}%`,
            }} />
          </div>
        ) : null}

        {layout === "list" && scene.items ? (
          <div style={{ marginTop: 60, width: "100%" }}>
            {scene.items.map((it, i) => {
              const s = spring({ frame: frame - speechFrom - i * 10, fps, config: { damping: 200 } });
              return (
                <div key={i} style={{
                  color: "white", fontSize: 58, fontWeight: 600, margin: "26px 0",
                  opacity: s, transform: `translateX(${(1 - s) * -80}px)`,
                  display: "flex", gap: 24, alignItems: "center",
                }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, background: accent, flexShrink: 0 }} />
                  {it}
                </div>
              );
            })}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
