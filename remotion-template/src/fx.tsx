import React from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { rnd } from "./util";

// ---------------------------------------------------------------- "after effects" layer
/** Hạt phim: 6 ô nhiễu xoay vòng mỗi 2 khung, lệch ngẫu nhiên tất định. */
export const FilmGrain: React.FC<{ strength?: number }> = ({ strength = 0.07 }) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  return (
    <AbsoluteFill style={{
      backgroundImage: `url(${staticFile(`fx/grain${k % 6}.png`)})`,
      backgroundSize: "256px 256px",
      backgroundPosition: `${Math.floor(rnd("gx", k) * 256)}px ${Math.floor(rnd("gy", k) * 256)}px`,
      opacity: strength, mixBlendMode: "overlay", pointerEvents: "none",
    }} />
  );
};

/** Viền tối kiểu ống kính + chút ánh sáng tràn. */
export const LensVignette: React.FC<{ strength?: number }> = ({ strength = 0.35 }) => (
  <AbsoluteFill style={{
    pointerEvents: "none",
    background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`,
  }} />
);

/** Dải đen điện ảnh (vd. 2.39:1). */
export const Letterbox: React.FC<{ ratio: number }> = ({ ratio }) => {
  const { width, height } = useVideoConfig();
  const bar = Math.max(0, (height - width / ratio) / 2);
  if (bar <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bar, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bar, background: "#000" }} />
    </AbsoluteFill>
  );
};

/** Vệt sáng rò (light leak) lúc chuyển chương — hoà trộn kiểu screen. */
export const LightLeak: React.FC<{ seed?: string; len?: number }> = ({ seed = "lk", len = 40 }) => {
  const f = useCurrentFrame();
  if (f > len) return null;
  const o = interpolate(f, [0, len * 0.35, len], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = interpolate(f, [0, len], [-20, 120]);
  const hue = rnd(seed, 1) > 0.5;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: o }}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 45% 70% at ${x}% ${30 + rnd(seed, 2) * 40}%, ${hue ? "rgba(255,170,90,.95)" : "rgba(255,120,140,.9)"}, rgba(255,140,80,0) 70%)`,
      }} />
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 30% 50% at ${x - 25}% ${60 + rnd(seed, 3) * 25}%, rgba(255,230,170,.8), rgba(255,230,170,0) 70%)`,
      }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- color grades
export const GRADES: Record<string, string> = {
  none: "none",
  film: "contrast(1.06) saturate(1.06)",
  warm: "sepia(0.14) saturate(1.12) contrast(1.05) brightness(1.02)",
  golden: "sepia(0.22) saturate(1.2) contrast(1.06) hue-rotate(-6deg)",
  cool: "saturate(0.9) contrast(1.08) hue-rotate(8deg) brightness(0.98)",
  night: "saturate(0.85) contrast(1.12) brightness(0.92) hue-rotate(10deg)",
  memory: "sepia(0.35) saturate(0.85) contrast(0.95) brightness(1.05)",
  vivid: "saturate(1.3) contrast(1.08)",
};

export type TransitionKind = "fade" | "zoom" | "blur" | "leak" | "dip" | "slide";

/** Style cho lớp nền đang vào (f = khung kể từ lúc bắt đầu hoà trộn). */
export function transitionStyle(kind: TransitionKind, f: number, len: number): React.CSSProperties {
  const t = Math.max(0, Math.min(1, f / len));
  const e = t * t * (3 - 2 * t);
  switch (kind) {
    case "zoom":
      return { opacity: e, transform: `scale(${1.12 - 0.12 * e})` };
    case "blur":
      return { opacity: e, filter: `blur(${(1 - e) * 14}px)` };
    case "slide":
      return { opacity: Math.min(1, e * 1.6), transform: `translateX(${(1 - e) * 6}%)` };
    case "dip": {
      // nửa đầu: lớp đen (do Stage vẽ), nửa sau mới hiện
      const o = Math.max(0, (t - 0.5) * 2);
      return { opacity: o * o * (3 - 2 * o) };
    }
    default:
      return { opacity: e };
  }
}
