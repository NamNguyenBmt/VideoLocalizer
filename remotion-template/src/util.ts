import { interpolate, random } from "remotion";

export const W = 1920;
export const H = 1080;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const ramp = (v: number, a: number, b: number) => ease((v - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const fade = (f: number, dur: number, inF = 15, outF = 15) =>
  interpolate(f, [0, inF, Math.max(inF + 1, dur - outF), Math.max(inF + 2, dur)], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Deterministic pseudo-random in [0,1). */
export const rnd = (seed: string | number, i = 0) => random(`${seed}-${i}`);

/** A mountain ridge as a closed SVG path (filled to the bottom). */
export function ridge(seed: string, opts: {
  base: number; amp: number; width?: number; points?: number; sharp?: number; bottom?: number;
}): string {
  const { base, amp, width = W * 1.6, points = 90, sharp = 0.6, bottom = H } = opts;
  const ph = [0, 1, 2, 3].map((i) => rnd(seed, i) * Math.PI * 2);
  const fr = [1.3, 2.9, 6.1, 13.7].map((f, i) => f * (0.8 + 0.4 * rnd(seed, 10 + i)));
  let d = `M0,${bottom} `;
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const u = (x / W) * Math.PI;
    let n = 0.55 * Math.sin(u * fr[0] + ph[0]) + 0.28 * Math.sin(u * fr[1] + ph[1]) +
      0.12 * Math.sin(u * fr[2] + ph[2]) + 0.05 * Math.sin(u * fr[3] + ph[3]);
    n = (1 - sharp) * n + sharp * (1 - 2 * Math.abs(Math.sin((u * fr[0]) / 2 + ph[0]))) * 0.9;
    d += `L${x.toFixed(1)},${(base - amp * n).toFixed(1)} `;
  }
  return d + `L${width},${bottom} Z`;
}

/** Height of a ridge at x (same formula as ridge()), for placing things on it. */
export function ridgeY(seed: string, base: number, amp: number, x: number, sharp = 0.6): number {
  const ph = [0, 1, 2, 3].map((i) => rnd(seed, i) * Math.PI * 2);
  const fr = [1.3, 2.9, 6.1, 13.7].map((f, i) => f * (0.8 + 0.4 * rnd(seed, 10 + i)));
  const u = (x / W) * Math.PI;
  let n = 0.55 * Math.sin(u * fr[0] + ph[0]) + 0.28 * Math.sin(u * fr[1] + ph[1]) +
    0.12 * Math.sin(u * fr[2] + ph[2]) + 0.05 * Math.sin(u * fr[3] + ph[3]);
  n = (1 - sharp) * n + sharp * (1 - 2 * Math.abs(Math.sin((u * fr[0]) / 2 + ph[0]))) * 0.9;
  return base - amp * n;
}

export function mix(c1: string, c2: string, t: number): string {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const a = p(c1);
  const b = p(c2);
  return "#" + a.map((v, i) => Math.round(lerp(v, b[i], clamp01(t))).toString(16).padStart(2, "0")).join("");
}

export type SkyName = "dawn" | "day" | "dusk" | "night" | "rain" | "warm" | "stage" | "deep";

export const SKIES: Record<SkyName, { sky: [string, string, string]; far: string; near: string; haze: string }> = {
  dawn: { sky: ["#1d2b53", "#c8648a", "#ffcf8b"], far: "#8a6f9e", near: "#1c1830", haze: "#ffd9b0" },
  day: { sky: ["#2f7fc1", "#8fcbe8", "#eaf6fb"], far: "#8db7c4", near: "#24493f", haze: "#ffffff" },
  dusk: { sky: ["#2a1745", "#b2456e", "#fbb45c"], far: "#7d4a6e", near: "#1d0f24", haze: "#ffb37a" },
  night: { sky: ["#03050d", "#0b1730", "#1c2d4d"], far: "#1b2b48", near: "#04060c", haze: "#3a5680" },
  rain: { sky: ["#070b12", "#152131", "#26384b"], far: "#22344a", near: "#06090f", haze: "#4b6178" },
  warm: { sky: ["#1a0f0a", "#4a2614", "#a8642b"], far: "#5e3a22", near: "#140a06", haze: "#ffb76b" },
  stage: { sky: ["#05040a", "#120c22", "#271a3d"], far: "#1d1530", near: "#05040a", haze: "#8f6bd6" },
  deep: { sky: ["#020308", "#060a16", "#0e1628"], far: "#0e1628", near: "#020308", haze: "#2b3f66" },
};

export const FONT_SANS = "BVP, 'Be Vietnam Pro', Arial, sans-serif";
export const FONT_SERIF = "PFD, 'Playfair Display', Georgia, serif";

export const pad = (n: number, w: number) => String(n).padStart(w, "0");
export const fmtNum = (v: number, decimals = 0, padTo = 0) => {
  const fixed = v.toFixed(decimals);
  const [i, d] = fixed.split(".");
  const ip = pad(Number(i), padTo).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d ? `${ip},${d}` : ip;
};
