import React from "react";
import { useSeg } from "./seg";

export type Pose = "stand" | "walk" | "run" | "up" | "wave" | "reach" | "hold" | "read" | "sit" | "kneel" | "dance";

/**
 * A silhouette person, feet at (x, y). Adult ≈ 190px tall at s = 1.
 * Drawn with thick round strokes so it reads well as a stage/LED silhouette.
 */
export const Figure: React.FC<{
  x: number; y: number; s?: number; color?: string; pose?: Pose; facing?: 1 | -1;
  skirt?: boolean; bag?: boolean; hair?: "long" | "bun" | "short"; phase?: number; speed?: number;
  hat?: boolean; carry?: "child" | "basket" | "book" | "lamp" | "pouch"; rot?: number; glow?: string;
}> = ({
  x, y, s = 1, color = "#0b0d14", pose = "stand", facing = 1, skirt, bag, hair = "short", phase = 0,
  speed = 1, hat, carry, rot = 0, glow,
}) => {
  const { f } = useSeg();
  const w = (f / 30) * Math.PI * 2 * (pose === "run" ? 1.5 : 0.9) * speed + phase;
  const moving = pose === "walk" || pose === "run";
  const swing = moving ? Math.sin(w) * (pose === "run" ? 34 : 22) : 0;
  const bob = moving ? Math.abs(Math.sin(w)) * 4 : pose === "dance" ? Math.abs(Math.sin(w * 1.2)) * 8 : 0;
  const lw = 15;
  const hipY = -92;
  const shY = -150;
  const deg = (a: number) => (a * Math.PI) / 180;
  const limb = (x0: number, y0: number, ang: number, len: number) =>
    `M${x0},${y0} L${(x0 + Math.sin(deg(ang)) * len).toFixed(1)},${(y0 + Math.cos(deg(ang)) * len).toFixed(1)}`;

  // arm/leg angles in degrees: 0 = straight down, positive = forward (towards facing)
  let la = -10 - swing;
  let ra = 10 + swing;
  let ll = swing;
  let rl = -swing;
  let armLen = 66;
  let sitting = false;
  if (pose === "up") { la = 160; ra = -160; }
  if (pose === "wave") { la = -10; ra = 150 + Math.sin(w * 2) * 20; }
  if (pose === "reach") { la = 80; ra = 95; }
  if (pose === "hold" || pose === "read") { la = 55; ra = 55; armLen = 56; }
  if (pose === "dance") { la = 120 + Math.sin(w) * 30; ra = -120 - Math.sin(w + 1) * 30; ll = Math.sin(w) * 18; rl = -Math.sin(w) * 18; }
  if (pose === "sit") { sitting = true; la = 60; ra = 60; }
  if (pose === "kneel") { ll = 90; rl = 0; }
  if (carry === "child") { la = -40; ra = -40; }

  return (
    <g transform={`translate(${x},${y - bob * s}) scale(${s * facing},${s}) rotate(${rot})`} fill={color} stroke={color}
      strokeLinecap="round" strokeLinejoin="round">
      {glow ? <ellipse cx={0} cy={-100} rx={110} ry={150} fill={glow} opacity={0.18} stroke="none" /> : null}
      {/* legs */}
      {sitting ? (
        <path d={`M-8,${hipY} L40,${hipY} L40,-4 M8,${hipY} L52,${hipY} L52,-4`} strokeWidth={lw} fill="none" />
      ) : (
        <>
          <path d={limb(-7, hipY, ll, 92)} strokeWidth={lw} fill="none" />
          <path d={limb(7, hipY, rl, 92)} strokeWidth={lw} fill="none" />
        </>
      )}
      {/* body */}
      {skirt ? (
        <path d={`M-20,${shY} L20,${shY} L34,${hipY + 30} L-34,${hipY + 30} Z`} stroke="none" />
      ) : (
        <path d={`M-22,${shY} L22,${shY} L17,${hipY + 4} L-17,${hipY + 4} Z`} stroke="none" />
      )}
      {skirt ? <path d={`M-34,${hipY + 30} L34,${hipY + 30} L30,${hipY + 36} L-30,${hipY + 36} Z`} fill="#c0392b" stroke="none" opacity={0.85} /> : null}
      {bag ? <rect x={-36} y={shY + 4} width={20} height={44} rx={6} stroke="none" /> : null}
      {/* arms */}
      <path d={limb(-16, shY + 6, la, armLen)} strokeWidth={lw - 3} fill="none" />
      <path d={limb(16, shY + 6, ra, armLen)} strokeWidth={lw - 3} fill="none" />
      {/* head + hair */}
      <circle cx={0} cy={shY - 26} r={21} stroke="none" />
      {hair === "long" ? <path d={`M-20,${shY - 36} Q-30,${shY + 10} -16,${shY + 20} L-6,${shY - 10} Z`} stroke="none" /> : null}
      {hair === "bun" ? <circle cx={-14} cy={shY - 44} r={10} stroke="none" /> : null}
      {hat ? <path d={`M-34,${shY - 36} L34,${shY - 36} L0,${shY - 70} Z`} stroke="none" /> : null}
      {/* carried things */}
      {carry === "child" ? (
        <g transform={`translate(-26,${shY - 6})`}>
          <circle cx={-6} cy={-22} r={14} stroke="none" />
          <path d="M-18,-8 L10,-8 L6,40 L-16,40 Z" stroke="none" />
          <path d="M8,0 L34,18" strokeWidth={9} fill="none" />
        </g>
      ) : null}
      {carry === "basket" ? <path d={`M30,${shY + 40} h56 l-8,40 h-40 Z`} stroke="none" /> : null}
      {carry === "book" ? <rect x={34} y={shY + 18} width={34} height={44} rx={3} fill="#f4e3b1" stroke="none" /> : null}
      {carry === "pouch" ? <circle cx={52} cy={shY + 58} r={14} fill="#c9a26a" stroke="none" /> : null}
      {carry === "lamp" ? (
        <g transform={`translate(56,${shY + 40})`}>
          <circle r={60} fill="#ffcf6b" opacity={0.25} stroke="none" />
          <circle r={12} fill="#ffd98a" stroke="none" />
        </g>
      ) : null}
    </g>
  );
};

/** Woven basket with a sleeping baby wrapped in a blanket. */
export const BabyBasket: React.FC<{ x: number; y: number; s?: number; glow?: boolean }> = ({ x, y, s = 1, glow = true }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {glow ? <ellipse cx={0} cy={-30} rx={150} ry={90} fill="#ffd9a0" opacity={0.18} /> : null}
    <path d="M-80,-50 L80,-50 L62,0 L-62,0 Z" fill="#8a5a2b" />
    {Array.from({ length: 6 }).map((_, i) => (
      <path key={i} d={`M-76,${-44 + i * 8} L76,${-44 + i * 8}`} stroke="#6b421d" strokeWidth={2} />
    ))}
    <ellipse cx={0} cy={-54} rx={64} ry={22} fill="#e9dcc3" />
    <circle cx={-24} cy={-62} r={15} fill="#f2d6b9" />
    <path d="M-80,-50 Q0,-140 80,-50" fill="none" stroke="#6b421d" strokeWidth={6} />
    <rect x={20} y={-70} width={30} height={20} fill="#fffbe9" transform="rotate(-12 35 -60)" />
  </g>
);
