import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { FONT_SANS, FONT_SERIF, rnd } from "../util";
import { useSeg } from "./seg";

/** Cover artwork (used when no real cover image is given). */
const CoverArt: React.FC<{ title: string; author: string; publisher: string }> = ({ title, author, publisher }) => (
  <svg viewBox="0 0 600 860" width="100%" height="100%">
    <defs>
      <linearGradient id="cv-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0b1633" />
        <stop offset="0.6" stopColor="#253a6b" />
        <stop offset="1" stopColor="#f0a35e" />
      </linearGradient>
      <radialGradient id="cv-glow">
        <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.95" />
        <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="600" height="860" fill="url(#cv-sky)" />
    {Array.from({ length: 60 }).map((_, i) => (
      <circle key={i} cx={rnd("cs", i) * 600} cy={rnd("cs", i + 99) * 420} r={0.8 + rnd("cs", i + 7) * 1.6} fill="#fff" opacity={0.7} />
    ))}
    <path d="M0,640 L90,520 L170,590 L280,430 L380,560 L470,480 L600,600 L600,860 L0,860 Z" fill="#1d2a4a" />
    <path d="M0,720 L120,610 L230,690 L330,600 L450,690 L600,640 L600,860 L0,860 Z" fill="#0f1830" />
    <circle cx="300" cy="455" r="150" fill="url(#cv-glow)" />
    <path d="M292,470 L308,470 L304,440 L296,440 Z" fill="#ffd98a" />
    <path d="M300,415 C308,428 309,436 300,442 C291,436 292,428 300,415 Z" fill="#fff4c9" />
    <rect x="0" y="40" width="600" height="8" fill="#f2b544" />
    <text x="300" y="120" textAnchor="middle" fontFamily={FONT_SANS} fontSize="22" letterSpacing="6" fill="#f6e7c1">{author.toUpperCase()}</text>
    <text x="300" y="215" textAnchor="middle" fontFamily={FONT_SERIF} fontWeight="800" fontSize="66" fill="#fff">{title.split(" ").slice(0, 3).join(" ")}</text>
    <text x="300" y="295" textAnchor="middle" fontFamily={FONT_SERIF} fontWeight="800" fontSize="66" fill="#ffd27a">{title.split(" ").slice(3).join(" ")}</text>
    <rect x="215" y="780" width="170" height="40" rx="20" fill="#e63946" />
    <text x="300" y="808" textAnchor="middle" fontFamily={FONT_SANS} fontWeight="800" fontSize="20" fill="#fff">{publisher}</text>
  </svg>
);

/** A floating 3D hardcover. Pass `cover` (file in public/) to use the real cover photo. */
export const Book3D: React.FC<{
  x?: string; y?: string; width?: number; cover?: string; title?: string; author?: string; publisher?: string; tilt?: number;
}> = ({ x = "50%", y = "50%", width: w0 = 430, cover, title = "NGƯỜI THẮP ĐÈN CHO NÚI", author = "Nhiều tác giả", publisher = "NXB KIM ĐỒNG", tilt = 1 }) => {
  const { f } = useSeg();
  const vc = useVideoConfig();
  const width = w0 * Math.max(vc.width / 1920, vc.height / 1080);
  const h = width * (860 / 600);
  const ry = (-24 + Math.sin(f / 70) * 8) * tilt;
  const float = Math.sin(f / 45) * 10;
  const depth = width * 0.12;
  return (
    <div style={{
      position: "absolute", left: x, top: y, width, height: h, perspective: 1800,
      transform: `translate(-50%, -50%) translateY(${float}px)`,
    }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateY(${ry}deg) rotateX(4deg)` }}>
        {/* page edges (behind the cover, peeking out on the right) */}
        <div style={{
          position: "absolute", top: 10, bottom: 10, left: 14, right: -depth * 0.35, borderRadius: "0 8px 8px 0",
          background: "repeating-linear-gradient(0deg,#f3ead2 0 3px,#d6c9a9 3px 4px)", boxShadow: "0 30px 60px rgba(0,0,0,.5)",
        }} />
        {/* cover */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "4px 10px 10px 4px", overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,.55), inset 8px 0 14px rgba(0,0,0,.35)",
        }}>
          {cover ? <Img src={staticFile(cover)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <CoverArt title={title} author={author} publisher={publisher} />}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${100 + ry}deg, rgba(255,255,255,.22), rgba(255,255,255,0) 40%)` }} />
        </div>
      </div>
      <div style={{
        position: "absolute", left: "10%", right: "10%", bottom: -60, height: 40, borderRadius: "50%",
        background: "radial-gradient(rgba(0,0,0,.5), rgba(0,0,0,0) 70%)",
      }} />
    </div>
  );
};

/** Đăng Tâm tree that grows with `g` (0..1) and lights up its fruits at the end. */
export const GrowingTree: React.FC<{ x: number; y: number; s?: number; g: number; fruit?: number }> = ({ x, y, s = 1, g, fruit = 0 }) => {
  const { f } = useSeg();
  const branches = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; d: number; w: number }[] = [];
    const grow = (x1: number, y1: number, ang: number, len: number, d: number, seed: number) => {
      const x2 = x1 + Math.cos(ang) * len;
      const y2 = y1 + Math.sin(ang) * len;
      out.push({ x1, y1, x2, y2, d, w: Math.max(2, 22 - d * 4.2) });
      if (d >= 5) return;
      const k = 2 + (rnd("tree", seed) > 0.6 ? 1 : 0);
      for (let i = 0; i < k; i++) {
        const spread = 0.42 + rnd("tree", seed * 7 + i) * 0.3;
        const a = ang + (i - (k - 1) / 2) * spread + (rnd("tree", seed * 13 + i) - 0.5) * 0.2;
        grow(x2, y2, a, len * (0.68 + rnd("tree", seed * 3 + i) * 0.12), d + 1, seed * 4 + i + 1);
      }
    };
    grow(0, 0, -Math.PI / 2, 150, 0, 1);
    return out;
  }, []);
  const tips = branches.filter((b) => b.d === 5);
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {branches.map((b, i) => {
        const local = Math.max(0, Math.min(1, g * 6.2 - b.d));
        if (local <= 0) return null;
        const sw = Math.sin(f / 50 + b.d) * b.d * 0.6;
        return <line key={i} x1={b.x1 + sw * 0.5} y1={b.y1} x2={b.x1 + (b.x2 - b.x1) * local + sw} y2={b.y1 + (b.y2 - b.y1) * local}
          stroke="#3b2618" strokeWidth={b.w} strokeLinecap="round" />;
      })}
      {tips.map((b, i) => {
        const leaf = Math.max(0, Math.min(1, g * 6.2 - 5.4));
        if (leaf <= 0) return null;
        const pulse = 0.6 + 0.4 * Math.sin(f / 14 + i);
        return (
          <g key={i}>
            <circle cx={b.x2} cy={b.y2} r={26 * leaf} fill="#3f7d3a" opacity={0.85} />
            {fruit > 0 && i % 3 === 0 ? (
              <g opacity={fruit}>
                <circle cx={b.x2} cy={b.y2 + 6} r={30} fill="#ffd27a" opacity={0.18 * pulse} />
                <circle cx={b.x2} cy={b.y2 + 6} r={8} fill="#ffcf5a" />
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

/** Full-screen image layer with slow Ken-Burns (for user photos dropped in public/). */
export const PhotoLayer: React.FC<{ src: string }> = ({ src }) => {
  const { p } = useSeg();
  return (
    <AbsoluteFill>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.05 + p * 0.1})` }} />
    </AbsoluteFill>
  );
};
