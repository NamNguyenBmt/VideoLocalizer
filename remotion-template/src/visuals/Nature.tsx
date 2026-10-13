import React from "react";
import { H, W, SKIES, SkyName, mix, ridge, rnd } from "../util";
import { useSeg } from "./seg";

// ---------------------------------------------------------------- sky & light
export const Sky: React.FC<{ name: SkyName; id: string }> = ({ name, id }) => {
  const s = SKIES[name];
  return (
    <>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.sky[0]} />
          <stop offset="0.62" stopColor={s.sky[1]} />
          <stop offset="1" stopColor={s.sky[2]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${id})`} />
    </>
  );
};

export const Sun: React.FC<{ x: number; y0: number; y1: number; r?: number; color?: string; id: string; glow?: number }> = ({
  x, y0, y1, r = 70, color = "#fff2c4", id, glow = 1,
}) => {
  const { p } = useSeg();
  const y = y0 + (y1 - y0) * Math.min(1, p * 1.4);
  return (
    <>
      <defs>
        <radialGradient id={`sun-${id}`}>
          <stop offset="0" stopColor={color} stopOpacity={0.9 * glow} />
          <stop offset="0.25" stopColor={color} stopOpacity={0.35 * glow} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r * 7} fill={`url(#sun-${id})`} />
      <circle cx={x} cy={y} r={r} fill={color} />
    </>
  );
};

export const Moon: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 46 }) => (
  <>
    <defs>
      <radialGradient id="moonglow">
        <stop offset="0" stopColor="#dfe8ff" stopOpacity="0.35" />
        <stop offset="1" stopColor="#dfe8ff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r * 5} fill="url(#moonglow)" />
    <circle cx={x} cy={y} r={r} fill="#eef2ff" />
    <circle cx={x + r * 0.38} cy={y - r * 0.15} r={r * 0.92} fill="#0b1730" opacity={0.92} />
  </>
);

export const Stars: React.FC<{ n?: number; maxY?: number; seed?: string }> = ({ n = 160, maxY = 620, seed = "st" }) => {
  const { f } = useSeg();
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(f / (20 + rnd(seed, i * 7) * 40) + rnd(seed, i) * 9));
        return (
          <circle key={i} cx={rnd(seed, i * 3) * W} cy={rnd(seed, i * 3 + 1) * maxY}
            r={0.6 + rnd(seed, i * 3 + 2) * 1.8} fill="#fff" opacity={tw * 0.85} />
        );
      })}
    </g>
  );
};

/** A parallax mountain layer. depth 0 = far, 1 = near. */
export const Mountains: React.FC<{
  seed: string; base: number; amp: number; color: string; drift?: number; sharp?: number; opacity?: number;
}> = ({ seed, base, amp, color, drift = 0.15, sharp = 0.6, opacity = 1 }) => {
  const { f } = useSeg();
  // trôi qua lại thật chậm (không bị giật khi cảnh dài)
  const A = W * 0.25;
  const x = -W * 0.05 - A * (0.5 - 0.5 * Math.cos((f * drift) / A));
  return (
    <path d={ridge(seed, { base, amp, sharp })} fill={color} opacity={opacity}
      transform={`translate(${x.toFixed(1)},0)`} />
  );
};

/** Layered ranges with atmospheric perspective from the sky palette. */
export const Ranges: React.FC<{ sky: SkyName; seed?: string; layers?: number; top?: number; speed?: number }> = ({
  sky, seed = "rg", layers = 4, top = 560, speed = 1,
}) => {
  const s = SKIES[sky];
  return (
    <g>
      {Array.from({ length: layers }).map((_, i) => {
        const k = i / Math.max(1, layers - 1);
        return (
          <Mountains key={i} seed={`${seed}${i}`} base={top + k * 300} amp={210 - k * 90}
            color={mix(s.far, s.near, k)} drift={(0.06 + k * 0.35) * speed} sharp={0.7 - k * 0.4} />
        );
      })}
    </g>
  );
};

export const Mist: React.FC<{ y: number; color?: string; opacity?: number; n?: number; seed?: string }> = ({
  y, color = "#ffffff", opacity = 0.25, n = 7, seed = "mist",
}) => {
  const { f } = useSeg();
  const id = `mist-${seed}`;
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      {Array.from({ length: n }).map((_, i) => {
        const sp = 0.2 + rnd(seed, i) * 0.5;
        const x = ((rnd(seed, i + 9) * W * 2.2 + f * sp) % (W * 2.2)) - W * 0.6;
        return <ellipse key={i} cx={x} cy={y + (rnd(seed, i + 20) - 0.5) * 120} rx={420 + rnd(seed, i + 30) * 300}
          ry={60 + rnd(seed, i + 40) * 50} fill={`url(#${id})`} />;
      })}
    </g>
  );
};

export const Rain: React.FC<{ n?: number; opacity?: number; seed?: string; lightning?: boolean }> = ({
  n = 170, opacity = 0.35, seed = "rain", lightning = true,
}) => {
  const { f } = useSeg();
  const flashT = f % 330;
  const flash = lightning && (flashT < 4 || (flashT > 7 && flashT < 10)) ? 0.25 : 0;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const sp = 28 + rnd(seed, i) * 22;
        const x0 = rnd(seed, i + 1) * (W + 300);
        const y = ((rnd(seed, i + 2) * H + f * sp) % (H + 200)) - 100;
        const x = x0 - (y / H) * 160;
        return <line key={i} x1={x} y1={y} x2={x - 9} y2={y + 46} stroke="#b9cde6" strokeWidth={1.6}
          opacity={opacity * (0.5 + rnd(seed, i + 3) * 0.5)} strokeLinecap="round" />;
      })}
      <rect width={W} height={H} fill="#dfe9ff" opacity={flash} />
    </g>
  );
};

export const Birds: React.FC<{ n?: number; y?: number; seed?: string }> = ({ n = 6, y = 300, seed = "bd" }) => {
  const { f } = useSeg();
  return (
    <g fill="none" stroke="#1b1b2b" strokeWidth={3} strokeLinecap="round" opacity={0.75}>
      {Array.from({ length: n }).map((_, i) => {
        const x = ((rnd(seed, i) * W + f * (1.6 + rnd(seed, i + 5))) % (W + 200)) - 100;
        const yy = y + rnd(seed, i + 2) * 160 + Math.sin(f / 20 + i) * 8;
        const w = Math.sin(f / 4 + i * 2) * 9;
        const s = 10 + rnd(seed, i + 7) * 8;
        return <path key={i} d={`M${x - s},${yy - w} Q${x - s / 2},${yy - 4} ${x},${yy} Q${x + s / 2},${yy - 4} ${x + s},${yy - w}`} />;
      })}
    </g>
  );
};

export const Fireflies: React.FC<{ n?: number; color?: string; seed?: string; y0?: number; y1?: number; rise?: number; size?: number }> = ({
  n = 40, color = "#ffd27a", seed = "ff", y0 = 300, y1 = H, rise = 0.4, size = 4,
}) => {
  const { f } = useSeg();
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const span = y1 - y0;
        const x = rnd(seed, i) * W + Math.sin(f / (30 + i) + i) * 40;
        const y = y1 - ((rnd(seed, i + 1) * span + f * rise * (0.5 + rnd(seed, i + 2))) % span);
        const o = 0.3 + 0.7 * Math.abs(Math.sin(f / (12 + rnd(seed, i + 3) * 20) + i));
        const r = size * (0.6 + rnd(seed, i + 4));
        return (
          <g key={i} opacity={o}>
            <circle cx={x} cy={y} r={r * 3.5} fill={color} opacity={0.15} />
            <circle cx={x} cy={y} r={r} fill={color} />
          </g>
        );
      })}
    </g>
  );
};

export const Rays: React.FC<{ x: number; y: number; color?: string; n?: number; opacity?: number; len?: number }> = ({
  x, y, color = "#fff1c1", n = 14, opacity = 0.12, len = 1500,
}) => {
  const { f } = useSeg();
  return (
    <g opacity={opacity} transform={`rotate(${f * 0.05} ${x} ${y})`}>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const b = a + 0.08;
        return <path key={i} d={`M${x},${y} L${x + Math.cos(a) * len},${y + Math.sin(a) * len} L${x + Math.cos(b) * len},${y + Math.sin(b) * len} Z`} fill={color} />;
      })}
    </g>
  );
};

/** Rice terraces on a hill: stacked curved bands. */
export const Terraces: React.FC<{ x: number; y: number; w: number; h: number; colors?: [string, string]; seed?: string }> = ({
  x, y, w, h, colors = ["#7c9a3c", "#b6a347"], seed = "tr",
}) => {
  const rows = 11;
  return (
    <g>
      {Array.from({ length: rows }).map((_, i) => {
        const k = i / rows;
        const yy = y + k * h;
        const ww = w * (0.45 + 0.55 * k);
        const bulge = 26 + rnd(seed, i) * 22;
        const x0 = x + (w - ww) / 2 + (rnd(seed, i + 3) - 0.5) * 40;
        const d = `M${x0},${yy + h / rows} Q${x0 + ww / 2},${yy - bulge} ${x0 + ww},${yy + h / rows} L${x0 + ww},${yy + h / rows + 30} Q${x0 + ww / 2},${yy - bulge + 30} ${x0},${yy + h / rows + 30} Z`;
        return (
          <g key={i}>
            <path d={d} fill={mix(colors[0], colors[1], (i % 3) / 2)} />
            <path d={`M${x0},${yy + h / rows} Q${x0 + ww / 2},${yy - bulge} ${x0 + ww},${yy + h / rows}`} fill="none" stroke="#f5e9b5" strokeOpacity={0.35} strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
};

/** A winding river band with moving glints. */
export const River: React.FC<{ color?: string; glint?: string; y?: number }> = ({ color = "#4f8fb3", glint = "#e9f6ff", y = 820 }) => {
  const { f } = useSeg();
  const top = `M-50,${y} C400,${y - 70} 700,${y + 40} 1000,${y - 10} S1600,${y - 70} 1980,${y - 20}`;
  const d = `${top} L1980,${y + 120} C1600,${y + 60} 1300,${y + 160} 960,${y + 110} S300,${y + 70} -50,${y + 150} Z`;
  return (
    <g>
      <path d={d} fill={color} />
      {Array.from({ length: 26 }).map((_, i) => {
        const xx = ((rnd("rv", i) * 2000 + f * 1.2) % 2000) - 40;
        const yy = y + 20 + rnd("rv", i + 50) * 90 - Math.sin(xx / 300) * 30;
        return <line key={i} x1={xx} y1={yy} x2={xx + 30 + rnd("rv", i + 9) * 50} y2={yy} stroke={glint}
          strokeOpacity={0.25 + 0.4 * Math.abs(Math.sin(f / 15 + i))} strokeWidth={3} strokeLinecap="round" />;
      })}
    </g>
  );
};

/** Rolling Tây Nguyên hills with coffee rows. */
export const CoffeeHills: React.FC<{ y?: number; color?: string; row?: string }> = ({ y = 760, color = "#3f6b3a", row = "#2b4f2a" }) => (
  <g>
    <path d={`M0,${y} C300,${y - 90} 600,${y - 60} 900,${y - 20} S1500,${y - 110} 1920,${y - 40} L1920,1080 L0,1080 Z`} fill={color} />
    {Array.from({ length: 9 }).map((_, r) =>
      Array.from({ length: 40 }).map((__, c) => {
        const xx = c * 50 + (r % 2) * 25;
        const yy = y + 30 + r * 34 - Math.sin(xx / 300) * 30;
        return <ellipse key={`${r}-${c}`} cx={xx} cy={yy} rx={18} ry={11} fill={row} opacity={0.9} />;
      }),
    )}
  </g>
);

export const Ground: React.FC<{ y: number; color: string; curve?: number }> = ({ y, color, curve = 40 }) => (
  <path d={`M0,${y} Q${W / 2},${y - curve} ${W},${y} L${W},${H} L0,${H} Z`} fill={color} />
);

/** Simple tree: trunk + layered round crown. */
export const Tree: React.FC<{ x: number; y: number; s?: number; color?: string; trunk?: string }> = ({
  x, y, s = 1, color = "#1f3a2a", trunk = "#2b1d14",
}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-8} y={-120} width={16} height={120} fill={trunk} />
    <circle cx={0} cy={-150} r={60} fill={color} />
    <circle cx={-45} cy={-120} r={45} fill={color} />
    <circle cx={45} cy={-118} r={48} fill={color} />
  </g>
);

export const Pine: React.FC<{ x: number; y: number; s?: number; color?: string }> = ({ x, y, s = 1, color = "#14241c" }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} fill={color}>
    <rect x={-5} y={-30} width={10} height={30} />
    <path d="M0,-200 L45,-110 L25,-110 L60,-30 L-60,-30 L-25,-110 L-45,-110 Z" />
  </g>
);

export const Bamboo: React.FC<{ x: number; y: number; h?: number; color?: string; sway?: number }> = ({
  x, y, h = 420, color = "#2f4a2a", sway = 1,
}) => {
  const { f } = useSeg();
  const b = Math.sin(f / 40 + x) * 12 * sway;
  return (
    <g stroke={color} fill="none" strokeLinecap="round">
      <path d={`M${x},${y} Q${x + b / 2},${y - h / 2} ${x + b},${y - h}`} strokeWidth={10} />
      {Array.from({ length: 6 }).map((_, i) => {
        const yy = y - (h * (i + 1)) / 7;
        const xx = x + (b * (i + 1)) / 7;
        const dir = i % 2 ? 1 : -1;
        return <path key={i} d={`M${xx},${yy} q${dir * 40},-10 ${dir * 70},${10 + Math.sin(f / 30 + i) * 6}`} strokeWidth={6} />;
      })}
    </g>
  );
};
