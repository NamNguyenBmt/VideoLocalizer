import React from "react";
import { FONT_SANS, H, W, rnd } from "../util";
import { useSeg } from "./seg";

// ------------------------------------------------------------------ buildings
export const StiltHouse: React.FC<{ x: number; y: number; s?: number; color?: string; light?: number }> = ({
  x, y, s = 1, color = "#1a1420", light = 0,
}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {[-50, -15, 20, 52].map((px) => <rect key={px} x={px} y={-40} width={7} height={40} fill={color} />)}
    <rect x={-62} y={-92} width={130} height={54} fill={color} />
    <path d="M-92,-88 L4,-160 L98,-88 Z" fill={color} />
    {light > 0 ? <rect x={-30} y={-80} width={26} height={24} fill="#ffc86b" opacity={light} /> : null}
    {light > 0 ? <rect x={14} y={-80} width={26} height={24} fill="#ffc86b" opacity={light * 0.8} /> : null}
  </g>
);

/** Nhà dài Ê Đê (Buôn Tuôr). */
export const Longhouse: React.FC<{ x: number; y: number; s?: number; color?: string; light?: number }> = ({
  x, y, s = 1, color = "#2a1c14", light = 0,
}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-200 + i * 50} y={-50} width={8} height={50} fill={color} />)}
    <rect x={-210} y={-110} width={420} height={62} fill={color} />
    <path d="M-240,-104 Q0,-150 240,-104 L200,-230 Q0,-250 -200,-230 Z" fill={color} />
    <path d="M-60,-50 L-20,-50 L-30,0 L-70,0 Z" fill={color} />
    {light > 0 ? [-150, -70, 30, 120].map((px) => <rect key={px} x={px} y={-96} width={30} height={22} fill="#ffc86b" opacity={light} />) : null}
  </g>
);

export const Flag: React.FC<{ x: number; y: number; w?: number; pole?: number; wave?: number }> = ({
  x, y, w = 150, pole = 300, wave = 1,
}) => {
  const { f } = useSeg();
  const h = w * (2 / 3);
  const cols = 12;
  let top = "";
  let bot = "";
  for (let i = 0; i <= cols; i++) {
    const xx = (i / cols) * w;
    const dy = Math.sin(f / 7 - i * 0.6) * 7 * wave * (i / cols);
    top += `${i ? "L" : "M"}${x + xx},${y - pole + dy} `;
    bot = `L${x + xx},${y - pole + h + dy} ` + bot;
  }
  const mid = Math.sin(f / 7 - 3.6) * 7 * wave * 0.5;
  const sx = x + w / 2;
  const sy = y - pole + h / 2 + mid;
  const r = h * 0.3;
  const star = Array.from({ length: 10 }).map((_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.4 : r;
    return `${(sx + Math.cos(a) * rr).toFixed(1)},${(sy + Math.sin(a) * rr).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      <rect x={x - 5} y={y - pole - 10} width={7} height={pole + 10} fill="#d8d8d8" />
      <circle cx={x - 1.5} cy={y - pole - 12} r={7} fill="#f0c34a" />
      <path d={`${top} ${bot} Z`} fill="#da251d" />
      <polygon points={star} fill="#ffdd00" />
    </g>
  );
};

export const School: React.FC<{ x: number; y: number; s?: number; sign?: string; night?: boolean }> = ({
  x, y, s = 1, sign = "TRƯỜNG THCS HÒA PHÚ", night = false,
}) => {
  const wall = night ? "#20263a" : "#f3e3b3";
  const trim = night ? "#151a29" : "#d9b77a";
  const win = night ? "#ffcf73" : "#5b7fa0";
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={-420} y={-300} width={840} height={300} fill={wall} />
      <rect x={-420} y={-160} width={840} height={14} fill={trim} />
      <path d="M-450,-300 L450,-300 L400,-350 L-400,-350 Z" fill={night ? "#3a1d1d" : "#b5442e"} />
      {[-1, 0].map((row) =>
        Array.from({ length: 8 }).map((_, i) => (
          <rect key={`${row}-${i}`} x={-380 + i * 98} y={row === -1 ? -270 : -125} width={56} height={row === -1 ? 86 : 90}
            fill={win} opacity={night ? 0.5 + 0.5 * rnd("sw", i + row * 9) : 0.85} />
        )),
      )}
      <rect x={-160} y={-344} width={320} height={52} rx={6} fill="#1d3f8f" />
      <text x={0} y={-308} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={26} fill="#fff">{sign}</text>
    </g>
  );
};

/** Small wooden classroom on a hill (lớp học vùng cao). */
export const Hut: React.FC<{ x: number; y: number; s?: number; light?: number; color?: string }> = ({
  x, y, s = 1, light = 0, color = "#5b3a24",
}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-160} y={-110} width={320} height={110} fill={color} />
    {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={-160 + i * 40} y1={-110} x2={-160 + i * 40} y2={0} stroke="#3e2615" strokeWidth={3} />)}
    <path d="M-200,-100 L0,-210 L200,-100 Z" fill="#7a6a4a" />
    <path d="M-200,-100 L0,-210 L200,-100" fill="none" stroke="#5a4b31" strokeWidth={8} />
    <rect x={-120} y={-80} width={70} height={46} fill={light ? "#ffcf73" : "#2a1a10"} opacity={light ? light : 1} />
    <rect x={50} y={-80} width={70} height={46} fill={light ? "#ffcf73" : "#2a1a10"} opacity={light ? light : 1} />
    <rect x={-25} y={-70} width={50} height={70} fill="#2a1a10" />
  </g>
);

export const City: React.FC<{ x: number; y: number; w: number; color?: string; lights?: boolean }> = ({
  x, y, w, color = "#1d1830", lights = true,
}) => {
  const n = Math.floor(w / 70);
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const bw = 50 + rnd("city", i) * 40;
        const bh = 120 + rnd("city", i + 40) * 260;
        const bx = x + i * 70;
        return (
          <g key={i}>
            <rect x={bx} y={y - bh} width={bw} height={bh} fill={color} />
            {lights ? Array.from({ length: Math.floor(bh / 30) }).map((_, j) =>
              rnd("cw", i * 50 + j) > 0.55 ? <rect key={j} x={bx + 10 + (j % 2) * 18} y={y - bh + 12 + j * 26} width={10} height={12} fill="#ffd27f" opacity={0.75} /> : null,
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

export const Bridge: React.FC<{ x: number; y: number; w?: number }> = ({ x, y, w = 520 }) => (
  <g stroke="#3a2614" strokeLinecap="round" fill="none">
    <path d={`M${x},${y} Q${x + w / 2},${y + 40} ${x + w},${y}`} strokeWidth={14} />
    <path d={`M${x},${y - 70} Q${x + w / 2},${y - 20} ${x + w},${y - 70}`} strokeWidth={5} />
    {Array.from({ length: 9 }).map((_, i) => {
      const t = i / 8;
      const xx = x + t * w;
      const yb = y + 40 * 4 * t * (1 - t) * 0.5;
      const yt = y - 70 + 50 * 4 * t * (1 - t) * 0.5;
      return <line key={i} x1={xx} y1={yb} x2={xx} y2={yt} strokeWidth={4} />;
    })}
  </g>
);

// ------------------------------------------------------------------ lamp & light
export const Lamp: React.FC<{ x: number; y: number; s?: number; glow?: number }> = ({ x, y, s = 1, glow = 1 }) => {
  const { f } = useSeg();
  const fl = 1 + 0.06 * Math.sin(f / 2.3) + 0.04 * Math.sin(f / 5.1 + 1);
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <defs>
        <radialGradient id="lampglow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity={0.75 * glow} />
          <stop offset="0.3" stopColor="#ffb347" stopOpacity={0.28 * glow} />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <circle cx={0} cy={-150} r={520 * fl} fill="url(#lampglow)" />
      {/* base */}
      <path d="M-70,0 L70,0 L52,-20 L-52,-20 Z" fill="#6b4a2a" />
      <path d="M-58,-20 Q-80,-70 -40,-95 L40,-95 Q80,-70 58,-20 Z" fill="#a4733f" />
      <path d="M-58,-20 Q-80,-70 -40,-95 L40,-95 Q80,-70 58,-20 Z" fill="#ffcf7a" opacity={0.25} />
      <rect x={-30} y={-108} width={60} height={14} fill="#5c3f22" />
      {/* chimney */}
      <path d="M-26,-108 Q-50,-160 -22,-215 L-18,-270 L18,-270 L22,-215 Q50,-160 26,-108 Z" fill="url(#glass)" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} />
      {/* flame */}
      <g transform={`translate(0,-128) scale(${0.95 + 0.08 * Math.sin(f / 1.7)},${fl})`}>
        <path d="M0,-58 C16,-30 20,-10 0,0 C-20,-10 -16,-30 0,-58 Z" fill="#ffb02e" />
        <path d="M0,-40 C9,-22 10,-8 0,-2 C-10,-8 -9,-22 0,-40 Z" fill="#fff4c9" />
      </g>
    </g>
  );
};

/** Glowing hanging lanterns along a string. */
export const Lanterns: React.FC<{ y?: number; n?: number; colors?: string[] }> = ({
  y = 140, n = 9, colors = ["#e63946", "#f4a261", "#e9c46a", "#d62828"],
}) => {
  const { f } = useSeg();
  return (
    <g>
      <path d={`M-20,${y - 40} Q${W / 2},${y + 60} ${W + 20},${y - 40}`} fill="none" stroke="#2b1a10" strokeWidth={3} />
      {Array.from({ length: n }).map((_, i) => {
        const t = (i + 0.5) / n;
        const xx = t * W;
        const yy = y - 40 + 100 * 4 * t * (1 - t) * 0.5 + 40;
        const sw = Math.sin(f / 25 + i) * 4;
        const c = colors[i % colors.length];
        return (
          <g key={i} transform={`rotate(${sw} ${xx} ${yy - 40})`}>
            <line x1={xx} y1={yy - 40} x2={xx} y2={yy - 20} stroke="#2b1a10" strokeWidth={2} />
            <circle cx={xx} cy={yy + 20} r={90} fill={c} opacity={0.12} />
            <ellipse cx={xx} cy={yy + 20} rx={34} ry={42} fill={c} />
            <ellipse cx={xx} cy={yy + 20} rx={18} ry={38} fill="#fff3c4" opacity={0.35} />
            <rect x={xx - 14} y={yy - 26} width={28} height={8} fill="#7a4b1c" />
            <line x1={xx} y1={yy + 62} x2={xx} y2={yy + 90} stroke={c} strokeWidth={3} />
          </g>
        );
      })}
    </g>
  );
};

/** Thổ cẩm (brocade) band: repeating diamonds & zigzags. */
export const Brocade: React.FC<{ y: number; h?: number; colors?: string[]; opacity?: number; shift?: number }> = ({
  y, h = 46, colors = ["#b5172b", "#f2b544", "#1e2a5a", "#1a7f6b"], opacity = 1, shift = 0,
}) => {
  const n = Math.ceil(W / h) + 2;
  return (
    <g opacity={opacity}>
      <rect x={0} y={y} width={W} height={h} fill={colors[0]} />
      <rect x={0} y={y} width={W} height={4} fill={colors[1]} />
      <rect x={0} y={y + h - 4} width={W} height={4} fill={colors[1]} />
      {Array.from({ length: n }).map((_, i) => {
        const cx = (i * h + shift) % (n * h) - h;
        const cy = y + h / 2;
        const r = h * 0.32;
        return (
          <g key={i}>
            <path d={`M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`} fill={colors[i % 2 ? 2 : 3]} />
            <path d={`M${cx},${cy - r / 2.4} L${cx + r / 2.4},${cy} L${cx},${cy + r / 2.4} L${cx - r / 2.4},${cy} Z`} fill={colors[1]} />
            <path d={`M${cx + h / 2 - 6},${y + 8} L${cx + h / 2},${y + 14} L${cx + h / 2 + 6},${y + 8}`} stroke={colors[1]} strokeWidth={2} fill="none" />
          </g>
        );
      })}
    </g>
  );
};

/** Big festival drum seen from the front. */
export const Drum: React.FC<{ x: number; y: number; r?: number; hit?: number }> = ({ x, y, r = 260, hit = 0 }) => (
  <g transform={`translate(${x},${y}) scale(${1 + hit * 0.05})`}>
    <circle r={r * 1.5} fill="#ff6b3d" opacity={0.15 * hit} />
    <circle r={r + 26} fill="#5a1a10" />
    {Array.from({ length: 24 }).map((_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return <circle key={i} cx={Math.cos(a) * (r + 13)} cy={Math.sin(a) * (r + 13)} r={6} fill="#f2b544" />;
    })}
    <circle r={r} fill="#d9b27a" />
    <circle r={r} fill="#fff1c9" opacity={0.25 * hit} />
    <circle r={r * 0.62} fill="none" stroke="#9c3d1f" strokeWidth={8} />
    {Array.from({ length: 14 }).map((_, i) => {
      const a = (i / 14) * Math.PI * 2;
      const r1 = r * 0.25;
      const r2 = r * 0.55;
      return <path key={i} d={`M${Math.cos(a) * r1},${Math.sin(a) * r1} L${Math.cos(a + 0.12) * r2},${Math.sin(a + 0.12) * r2} L${Math.cos(a - 0.12) * r2},${Math.sin(a - 0.12) * r2} Z`} fill="#9c3d1f" />;
    })}
    <circle r={r * 0.2} fill="#9c3d1f" />
  </g>
);

/** Chalkboard on a wall. */
export const Chalkboard: React.FC<{ x: number; y: number; w: number; h: number; lines?: number; progress?: number }> = ({
  x, y, w, h, lines = 0, progress = 1,
}) => (
  <g>
    <rect x={x - 18} y={y - 18} width={w + 36} height={h + 36} rx={8} fill="#6b4a2a" />
    <rect x={x} y={y} width={w} height={h} fill="#1f3b2f" />
    <rect x={x} y={y} width={w} height={h} fill="url(#boardsheen)" opacity={0.2} />
    {Array.from({ length: lines }).map((_, i) => {
      const len = (w - 160) * (0.5 + 0.5 * rnd("cb", i)) * Math.max(0, Math.min(1, progress * lines - i));
      return <path key={i} d={`M${x + 80},${y + 90 + i * 70} q${len / 4},-8 ${len / 2},0 t${len / 2},0`} stroke="#e8efe6" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.85} />;
    })}
    <rect x={x + 30} y={y + h - 6} width={w - 60} height={12} fill="#4b3420" />
  </g>
);

/** Small cloth pouch tied with string (túi hạt giống). */
export const Pouch: React.FC<{ x: number; y: number; s?: number; open?: number }> = ({ x, y, s = 1, open = 0 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <circle cx={0} cy={-150} r={220} fill="#ffcf6b" opacity={0.12 + 0.18 * open} />
    <path d="M-120,0 Q-160,-120 -70,-190 L70,-190 Q160,-120 120,0 Z" fill="#b98a55" />
    <path d="M-120,0 Q-160,-120 -70,-190" fill="none" stroke="#8a5f33" strokeWidth={6} />
    <path d="M-70,-190 Q0,-170 70,-190 L60,-230 Q0,-210 -60,-230 Z" fill="#a67a47" />
    <path d="M-75,-195 Q0,-170 75,-195" fill="none" stroke="#5c3b1c" strokeWidth={8} />
    <ellipse cx={0} cy={-230} rx={60} ry={14 + open * 10} fill="#3b2410" />
    {Array.from({ length: 5 }).map((_, i) => (
      <path key={i} d={`M${-60 + i * 30},-120 l10,10 l10,-10`} stroke="#8a5f33" strokeWidth={3} fill="none" />
    ))}
  </g>
);

/** Desk with an open book (and room for a lamp). */
export const Desk: React.FC<{ x: number; y: number; w?: number; color?: string }> = ({ x, y, w = 700, color = "#3a2414" }) => (
  <g>
    <rect x={x - w / 2} y={y} width={w} height={26} fill={color} />
    <rect x={x - w / 2 + 30} y={y + 26} width={22} height={H - y} fill={color} />
    <rect x={x + w / 2 - 52} y={y + 26} width={22} height={H - y} fill={color} />
  </g>
);

export const OpenBook: React.FC<{ x: number; y: number; s?: number; glow?: number; flip?: number }> = ({
  x, y, s = 1, glow = 0, flip = -1,
}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {glow > 0 ? <ellipse cx={0} cy={-60} rx={420} ry={240} fill="#ffe6a8" opacity={0.18 * glow} /> : null}
    <path d="M0,-10 Q-150,-50 -300,-20 L-300,-190 Q-150,-220 0,-180 Z" fill="#f6ecd2" />
    <path d="M0,-10 Q150,-50 300,-20 L300,-190 Q150,-220 0,-180 Z" fill="#efe2c2" />
    {Array.from({ length: 7 }).map((_, i) => (
      <g key={i} stroke="#b9a77d" strokeWidth={3} opacity={0.6}>
        <path d={`M-260,${-160 + i * 20} Q-150,${-180 + i * 20} -40,${-150 + i * 20}`} fill="none" />
        <path d={`M40,${-150 + i * 20} Q150,${-180 + i * 20} 260,${-160 + i * 20}`} fill="none" />
      </g>
    ))}
    {flip >= 0 && flip <= 1 ? (
      <path d={`M0,-10 Q${150 * Math.cos(flip * Math.PI)},${-50 - 60 * Math.sin(flip * Math.PI)} ${300 * Math.cos(flip * Math.PI)},${-20 - 40 * Math.sin(flip * Math.PI)} L${300 * Math.cos(flip * Math.PI)},${-190 - 40 * Math.sin(flip * Math.PI)} Q${150 * Math.cos(flip * Math.PI)},${-220 - 60 * Math.sin(flip * Math.PI)} 0,-180 Z`}
        fill="#fbf4e1" stroke="#d9c79c" strokeWidth={2} />
    ) : null}
    <path d="M0,-180 L0,-10" stroke="#a48a5a" strokeWidth={4} />
    <path d="M-310,-14 Q-150,-44 0,0 Q150,-44 310,-14 L310,0 Q150,-30 0,14 Q-150,-30 -310,0 Z" fill="#7a3b22" />
  </g>
);
