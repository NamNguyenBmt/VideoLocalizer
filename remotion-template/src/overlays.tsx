import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Led, Panel, Scene, Speaker } from "./types";
import { FONT_SANS, FONT_SERIF, clamp01, fmtNum, ramp } from "./util";

const useU = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width / 1920, height / 1080);
};

const appear = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.8 } });

// ------------------------------------------------------------------ captions
/** Splits a line into ≤ maxWords chunks at punctuation where possible. */
function chunks(text: string, maxWords = 13): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [words.join(" ")];
  const out: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    const brk = /[,.;:!?…—]$/.test(w) && cur.length >= 5;
    if (cur.length >= maxWords || brk) {
      out.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length) {
    if (cur.length < 3 && out.length) out[out.length - 1] += " " + cur.join(" ");
    else out.push(cur.join(" "));
  }
  return out;
}

export const Captions: React.FC<{ text: string; from: number; frames: number; color?: string }> = ({
  text, from, frames, color = "#ffd166",
}) => {
  const frame = useCurrentFrame() - from;
  const u = useU();
  if (frame < 0 || frame > frames + 8) return null;
  const parts = chunks(text);
  const total = parts.reduce((n, p) => n + p.length, 0);
  let acc = 0;
  let idx = 0;
  let startF = 0;
  for (let i = 0; i < parts.length; i++) {
    const len = (parts[i].length / total) * frames;
    if (frame < acc + len || i === parts.length - 1) {
      idx = i;
      startF = acc;
      break;
    }
    acc += len;
  }
  const part = parts[idx];
  const partFrames = (part.length / total) * frames;
  const words = part.split(" ");
  const wl = words.reduce((n, w) => n + w.length + 1, 0);
  let c = 0;
  const o = interpolate(frame - startF, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 52 * u }}>
      <div style={{
        maxWidth: "78%", textAlign: "center", fontFamily: FONT_SANS, fontWeight: 600, fontSize: 44 * u, lineHeight: 1.35,
        color: "#fff", padding: `${10 * u}px ${28 * u}px`, borderRadius: 14 * u, background: "rgba(5,6,12,.55)",
        textShadow: "0 2px 8px rgba(0,0,0,.8)", opacity: o,
      }}>
        {words.map((w, i) => {
          const at = startF + (c / wl) * partFrames;
          c += w.length + 1;
          const on = frame >= at;
          return <span key={i} style={{ color: on ? "#fff" : "rgba(255,255,255,.55)", textDecorationColor: color }}>{w} </span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

export const SpeakerTag: React.FC<{ spk: Speaker; from: number }> = ({ spk, from }) => {
  const frame = useCurrentFrame() - from;
  const { fps } = useVideoConfig();
  const u = useU();
  const s = appear(frame, fps);
  return (
    <div style={{
      position: "absolute", left: 70 * u, bottom: 170 * u, display: "flex", alignItems: "center", gap: 14 * u,
      opacity: s, transform: `translateX(${(1 - s) * -30}px)`, fontFamily: FONT_SANS,
    }}>
      <div style={{ width: 10 * u, height: 46 * u, borderRadius: 5 * u, background: spk.color ?? "#fff" }} />
      <div style={{
        color: "#fff", fontSize: 30 * u, fontWeight: 700, letterSpacing: 1, textShadow: "0 2px 10px rgba(0,0,0,.8)",
      }}>{spk.name}</div>
    </div>
  );
};

// ------------------------------------------------------------------ big quote
export const BigText: React.FC<{ text: string; from: number; frames: number; color?: string }> = ({ text, from, frames, color = "#ffd27a" }) => {
  const frame = useCurrentFrame() - from;
  const { fps } = useVideoConfig();
  const u = useU();
  const words = text.split(/\s+/);
  const size = text.length > 120 ? 54 : text.length > 70 ? 66 : text.length > 35 ? 80 : 104;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${330 * u}px ${120 * u}px` }}>
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, rgba(4,5,10,0) 18%, rgba(4,5,10,.72) 38%, rgba(4,5,10,.72) 62%, rgba(4,5,10,0) 82%)",
        opacity: clamp01(frame / 12),
      }} />
      <div style={{
        position: "relative", textAlign: "center", fontFamily: FONT_SERIF, fontWeight: 700, fontSize: size * u, lineHeight: 1.25,
        color: "#fff", textShadow: `0 0 ${30 * u}px rgba(0,0,0,.6), 0 0 ${60 * u}px ${color}55`,
      }}>
        {words.map((w, i) => {
          const at = (i / words.length) * Math.max(10, frames * 0.8);
          const s = appear(frame, fps, at);
          return <span key={i} style={{ display: "inline-block", opacity: s, transform: `translateY(${(1 - s) * 18}px)`, marginRight: "0.25em" }}>{w}</span>;
        })}
        <div style={{ height: 5 * u, width: `${30 * clamp01(frame / 40)}%`, background: color, margin: `${28 * u}px auto 0`, borderRadius: 3 }} />
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ LED texts
export const LedText: React.FC<{ led: Led; from: number }> = ({ led, from }) => {
  const frame = useCurrentFrame() - from;
  const { fps } = useVideoConfig();
  const u = useU();
  const s = appear(frame, fps);
  const s2 = appear(frame, fps, 12);
  const style = led.style ?? "quote";
  if (style === "drum") {
    const words = led.title.split(" ");
    return (
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 110 * u }}>
        <div style={{ display: "flex", gap: 30 * u }}>
          {words.map((w, i) => {
            const k = appear(frame, fps, i * 28);
            return <div key={i} style={{
              fontFamily: FONT_SANS, fontWeight: 800, fontSize: 92 * u, color: "#ffd27a", opacity: k,
              transform: `scale(${1.4 - 0.4 * k})`, textShadow: "0 0 30px #ff6b3d",
            }}>{w}</div>;
          })}
        </div>
      </AbsoluteFill>
    );
  }
  const serif = style !== "part";
  const titleSize = { call: 76, gold: 150, part: 96, quote: 66, book: 88, lyric: 60, final: 78 }[style] ?? 70;
  const color = style === "gold" || style === "final" || style === "book" ? "#ffd27a" : "#fff";
  const pos: React.CSSProperties = style === "book"
    ? { justifyContent: "center", alignItems: "flex-start", paddingLeft: 120 * u, width: "48%" }
    : { justifyContent: "center", alignItems: "center", padding: `0 ${150 * u}px` };
  return (
    <AbsoluteFill style={{ ...pos, textAlign: style === "book" ? "left" : "center" }}>
      {style === "call" || style === "quote" || style === "lyric" ? (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,.5) 0%, rgba(0,0,0,0) 65%)" }} />
      ) : null}
      {style === "part" ? (
        <div style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: 30 * u, letterSpacing: 14 * u, color: "#f2b544", opacity: s, marginBottom: 20 * u }}>
          ✦ ✦ ✦
        </div>
      ) : null}
      <div style={{
        position: "relative", fontFamily: serif ? FONT_SERIF : FONT_SANS, fontWeight: 800, fontStyle: style === "quote" || style === "lyric" ? "italic" : "normal",
        fontSize: titleSize * u, lineHeight: 1.15, color, opacity: s, transform: `translateY(${(1 - s) * 30}px) scale(${0.96 + 0.04 * s})`,
        letterSpacing: style === "gold" ? 12 * u : style === "part" ? 6 * u : 0,
        textShadow: `0 0 ${40 * u}px rgba(0,0,0,.7)${color !== "#fff" ? `, 0 0 ${50 * u}px ${color}66` : ""}`,
      }}>{led.title}</div>
      {led.sub ? (
        <div style={{
          position: "relative", marginTop: 26 * u, fontFamily: style === "final" ? FONT_SERIF : FONT_SANS,
          fontStyle: style === "final" || style === "call" ? "italic" : "normal",
          fontWeight: style === "gold" || style === "part" ? 700 : 500, fontSize: (style === "part" ? 64 : style === "final" ? 46 : 40) * u,
          letterSpacing: style === "gold" ? 6 * u : style === "part" ? 10 * u : 1, color: style === "part" ? "#ffd27a" : "#f4ead7",
          opacity: s2, textShadow: "0 2px 18px rgba(0,0,0,.8)", maxWidth: 1400 * u,
        }}>{led.sub}</div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ chapter card & chip
export const SectionCard: React.FC<{ no?: string; title: string; from: number }> = ({ no, title, from }) => {
  const frame = useCurrentFrame() - from;
  const { fps } = useVideoConfig();
  const u = useU();
  const len = 3.4 * fps;
  if (frame < 0 || frame > len) return null;
  const o = interpolate(frame, [0, 10, len - 14, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = appear(frame, fps, 4);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o, pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "rgba(3,4,10,.45)" }} />
      <div style={{ position: "relative", textAlign: "center", fontFamily: FONT_SANS }}>
        {no ? <div style={{ color: "#f2b544", fontWeight: 700, fontSize: 34 * u, letterSpacing: 10 * u, marginBottom: 14 * u }}>{no}</div> : null}
        <div style={{
          fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 82 * u, color: "#fff", maxWidth: 1500 * u, lineHeight: 1.15,
          transform: `translateY(${(1 - s) * 24}px)`, textShadow: "0 6px 30px rgba(0,0,0,.6)",
        }}>{title}</div>
        <div style={{ height: 4 * u, width: 260 * u * s, background: "#f2b544", margin: `${26 * u}px auto 0` }} />
      </div>
    </AbsoluteFill>
  );
};

export const PartChip: React.FC<{ part?: string; section?: { no?: string; title: string }; fadeIn?: boolean }> = ({ part, section, fadeIn }) => {
  const u = useU();
  const f = useCurrentFrame();
  if (!part) return null;
  const o = fadeIn ? clamp01((f - 20) / 20) * 0.85 : 0.85;
  return (
    <div style={{
      position: "absolute", left: 60 * u, top: 46 * u, fontFamily: FONT_SANS, color: "#fff", display: "flex", alignItems: "center",
      gap: 14 * u, textShadow: "0 2px 10px rgba(0,0,0,.8)", opacity: o,
    }}>
      <div style={{ width: 12 * u, height: 12 * u, transform: "rotate(45deg)", background: "#f2b544" }} />
      <div style={{ fontWeight: 800, fontSize: 22 * u, letterSpacing: 4 * u, textTransform: "uppercase" }}>{part}</div>
      {section ? <div style={{ fontWeight: 500, fontSize: 22 * u, opacity: 0.8 }}>· {section.no ? `${section.no}. ` : ""}{section.title}</div> : null}
    </div>
  );
};

export const CueChip: React.FC<{ text: string }> = ({ text }) => {
  const u = useU();
  return (
    <div style={{
      position: "absolute", right: 60 * u, top: 46 * u, maxWidth: 760 * u, fontFamily: FONT_SANS, fontStyle: "italic",
      fontSize: 22 * u, color: "#fff", background: "rgba(0,0,0,.45)", padding: `${8 * u}px ${16 * u}px`, borderRadius: 8 * u,
      borderLeft: `4px solid #f2b544`,
    }}>{text}</div>
  );
};

// ------------------------------------------------------------------ panels
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; s: number }> = ({ children, style, s }) => (
  <div style={{
    background: "linear-gradient(160deg, rgba(20,16,34,.86), rgba(10,8,18,.86))", border: "1px solid rgba(242,181,68,.45)",
    borderRadius: 22, boxShadow: "0 30px 80px rgba(0,0,0,.5)", opacity: s, transform: `translateY(${(1 - s) * 40}px)`,
    fontFamily: FONT_SANS, color: "#fff", ...style,
  }}>{children}</div>
);

const Counter: React.FC<{ value: number; decimals?: number; pad?: number; frame: number; delay: number }> = ({ value, decimals = 0, pad = 0, frame, delay }) => {
  const k = ramp(frame, delay, delay + 45);
  return <>{fmtNum(value * k, decimals, pad)}</>;
};

export const PanelView: React.FC<{ panel: Panel; from: number; scene: Scene; reveal: number; speakers: Record<string, Speaker> }> = ({
  panel, from, reveal, speakers,
}) => {
  const frame = useCurrentFrame() - from;
  const { fps } = useVideoConfig();
  const u = useU();
  const s = appear(frame, fps);
  const k = panel.kind;
  const items = (panel.items as unknown[] | undefined) ?? [];

  if (k === "stats") {
    const list = items as { value: number; unit?: string; label?: string; decimals?: number; pad?: number }[];
    const side = panel.side === "right" ? "flex-end" : panel.side === "left" ? "flex-start" : "center";
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: side, padding: `0 ${110 * u}px ${150 * u}px` }}>
        <div style={{ display: "flex", gap: 36 * u, flexDirection: side !== "center" ? "column" : "row" }}>
          {list.map((it, i) => (
            <Card key={i} s={appear(frame, fps, i * 8)} style={{ padding: `${34 * u}px ${44 * u}px`, minWidth: 360 * u, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 92 * u, color: "#ffd27a", lineHeight: 1 }}>
                <Counter value={it.value} decimals={it.decimals} pad={it.pad} frame={frame} delay={i * 8} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 34 * u, marginTop: 8 * u }}>{it.unit}</div>
              {it.label ? <div style={{ fontSize: 26 * u, opacity: 0.8, marginTop: 6 * u, maxWidth: 380 * u }}>{it.label}</div> : null}
            </Card>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  if (k === "decree" || k === "card") {
    const lines = (panel.lines as string[] | undefined) ?? [];
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 150 * u }}>
        <Card s={s} style={{ padding: `${46 * u}px ${70 * u}px`, maxWidth: 1400 * u, textAlign: "center" }}>
          {k === "decree" ? <div style={{ fontSize: 26 * u, letterSpacing: 8 * u, color: "#f2b544", fontWeight: 700, marginBottom: 14 * u }}>NGHỊ QUYẾT</div> : null}
          <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: (k === "card" ? 58 : 64) * u, lineHeight: 1.2 }}>{String(panel.title ?? "")}</div>
          {panel.sub ? <div style={{ fontSize: 32 * u, opacity: 0.85, marginTop: 16 * u }}>{String(panel.sub)}</div> : null}
          {lines.map((l, i) => <div key={i} style={{ fontSize: 34 * u, marginTop: 10 * u, color: "#ffe2a8", opacity: appear(frame, fps, 10 + i * 6) }}>{l}</div>)}
        </Card>
      </AbsoluteFill>
    );
  }

  if (k === "merge") {
    const list = items as string[];
    const m = ramp(frame, 1.6 * fps, 2.6 * fps);
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 150 * u }}>
        <div style={{ position: "relative", width: 1400 * u, height: 420 * u }}>
          {list.map((t, i) => {
            const x0 = (i - 1) * 440 * u;
            const si = appear(frame, fps, i * 8);
            return (
              <div key={i} style={{ position: "absolute", left: "50%", top: 0, transform: `translateX(calc(-50% + ${x0 * (1 - m)}px)) translateY(${m * 40 * u}px) scale(${1 - m * 0.3})`, opacity: si * (1 - m * 0.9) }}>
                <Card s={1} style={{ padding: `${26 * u}px ${40 * u}px`, fontSize: 40 * u, fontWeight: 700, whiteSpace: "nowrap" }}>{t}</Card>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: "50%", top: 180 * u, transform: `translateX(-50%) scale(${0.8 + 0.2 * m})`, opacity: m }}>
            <Card s={1} style={{ padding: `${30 * u}px ${70 * u}px`, fontFamily: FONT_SERIF, fontSize: 76 * u, fontWeight: 800, color: "#ffd27a", whiteSpace: "nowrap" }}>
              {String(panel.result ?? "")}
            </Card>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (k === "map") {
    const box = (label: string, x: number, y: number, d: number) => {
      const si = appear(frame, fps, d);
      return (
        <div style={{ position: "absolute", left: x * u, top: y * u, transform: "translate(-50%,-50%)", opacity: si }}>
          <Card s={1} style={{ padding: `${16 * u}px ${28 * u}px`, fontSize: 30 * u, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</Card>
        </div>
      );
    };
    const dir = (t: string, x: number, y: number) => (
      <div style={{ position: "absolute", left: x * u, top: y * u, transform: "translate(-50%,-50%)", color: "#f2b544", fontFamily: FONT_SANS, fontWeight: 800, fontSize: 30 * u }}>{t}</div>
    );
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 150 * u }}>
        <div style={{ position: "relative", width: 1200 * u, height: 640 * u, opacity: s }}>
          <svg width="100%" height="100%" viewBox="0 0 1200 640" style={{ position: "absolute", inset: 0 }}>
            <path d="M600,90 L600,550 M200,320 L1000,320" stroke="#f2b544" strokeOpacity={0.5} strokeWidth={3} strokeDasharray="10 12" />
            <path d="M600,220 C700,210 760,280 740,340 C720,420 640,440 580,430 C500,420 450,360 470,300 C490,240 540,225 600,220 Z"
              fill="rgba(242,181,68,.25)" stroke="#f2b544" strokeWidth={4} />
          </svg>
          <div style={{ position: "absolute", left: 600 * u, top: 325 * u, transform: "translate(-50%,-50%)", fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 46 * u, color: "#fff" }}>
            {String(panel.center ?? "")}
          </div>
          {box(String(panel.n), 600, 50, 6)}{dir("B", 600, 140)}
          {box(String(panel.e), 1080, 320, 12)}{dir("Đ", 900, 320)}
          {box(String(panel.s), 600, 600, 18)}{dir("N", 600, 505)}
          {box(String(panel.w), 120, 320, 24)}{dir("T", 300, 320)}
        </div>
      </AbsoluteFill>
    );
  }

  if (k === "badge") {
    const lines = (panel.lines as string[] | undefined) ?? [];
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", padding: `0 ${120 * u}px ${170 * u}px` }}>
        <Card s={s} style={{ padding: `${40 * u}px ${56 * u}px`, textAlign: "center", width: 520 * u }}>
          <div style={{ fontSize: 28 * u, letterSpacing: 6 * u, color: "#f2b544", fontWeight: 700 }}>{String(panel.title ?? "").toUpperCase()}</div>
          <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 140 * u, lineHeight: 1.05, color: "#ffd27a" }}>{String(panel.value ?? "")}</div>
          {lines.map((l, i) => <div key={i} style={{ fontSize: 30 * u, marginTop: 8 * u, opacity: appear(frame, fps, 10 + i * 8) }}>{l}</div>)}
        </Card>
      </AbsoluteFill>
    );
  }

  if (k === "theme") {
    const list = items as string[];
    const icons = ["☀", "❀", "✎"];
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 160 * u }}>
        <div style={{ display: "flex", gap: 40 * u }}>
          {list.map((t, i) => (
            <Card key={i} s={appear(frame, fps, i * 14)} style={{ padding: `${40 * u}px ${56 * u}px`, textAlign: "center", minWidth: 340 * u }}>
              <div style={{ fontSize: 70 * u, color: "#ffd27a" }}>{icons[i % 3]}</div>
              <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 64 * u, marginTop: 10 * u }}>{t}</div>
            </Card>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  if (k === "portrait") {
    const who = String(panel.who ?? "");
    const color = speakers[who]?.color ?? "#ffd27a";
    const photo = panel.photo ? String(panel.photo) : "";
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 140 * u }}>
        <div style={{ display: "flex", alignItems: "center", gap: 60 * u, opacity: s, transform: `translateX(${(1 - s) * 80}px)` }}>
          <div style={{
            width: 380 * u, height: 380 * u, borderRadius: "50%", border: `${8 * u}px solid ${color}`, overflow: "hidden",
            background: `radial-gradient(circle at 50% 35%, ${color}55, #120d1c 70%)`, boxShadow: `0 0 ${80 * u}px ${color}55`,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}>
            {photo ? <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
              <svg viewBox="0 0 200 200" width="86%" height="86%">
                <circle cx="100" cy="80" r="42" fill="#05040a" opacity={0.85} />
                <path d="M20,200 Q20,128 100,128 Q180,128 180,200 Z" fill="#05040a" opacity={0.85} />
              </svg>
            )}
          </div>
          <div style={{ fontFamily: FONT_SANS }}>
            <div style={{ fontSize: 30 * u, letterSpacing: 6 * u, color, fontWeight: 700 }}>{String(panel.role ?? "").toUpperCase()}</div>
            <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 84 * u, color: "#fff", lineHeight: 1.1, marginTop: 10 * u, maxWidth: 900 * u }}>
              {String(panel.name ?? "")}
            </div>
            <div style={{ height: 5 * u, width: 200 * u * appear(frame, fps, 10), background: color, marginTop: 22 * u }} />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (k === "trio") {
    const who = ["vy", "myanh", "huy"];
    const full = ["Mai Nguyễn Tường Vy", "Phan Trần My Anh", "Phí Đức Huy"];
    const cls = ["Đội trưởng · 9C", "9C", "9E"];
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 170 * u }}>
        <div style={{ display: "flex", gap: 46 * u }}>
          {who.map((w, i) => {
            const c = speakers[w]?.color ?? "#fff";
            return (
              <Card key={w} s={appear(frame, fps, i * 8)} style={{ padding: `${30 * u}px ${36 * u}px`, width: 400 * u, textAlign: "center", borderColor: c }}>
                <div style={{ width: 150 * u, height: 150 * u, borderRadius: "50%", margin: "0 auto", border: `${6 * u}px solid ${c}`, background: `radial-gradient(circle at 50% 35%, ${c}55, #120d1c 70%)` }} />
                <div style={{ fontFamily: FONT_SERIF, fontWeight: 800, fontSize: 40 * u, marginTop: 18 * u }}>{full[i]}</div>
                <div style={{ fontSize: 26 * u, color: c, marginTop: 6 * u, fontWeight: 700 }}>{cls[i]}</div>
              </Card>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (k === "titles") {
    const list = items as string[];
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", padding: `0 ${140 * u}px ${160 * u}px` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 * u, alignItems: "flex-end" }}>
          {list.map((t, i) => {
            const si = appear(frame, fps, 10 + i * 22);
            return (
              <div key={i} style={{
                fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 46 * u, color: "#fff", opacity: si,
                transform: `translateX(${(1 - si) * 60}px)`, padding: `${8 * u}px ${26 * u}px`, borderRight: `${6 * u}px solid #f2b544`,
                background: "linear-gradient(270deg, rgba(10,8,18,.75), rgba(10,8,18,0))", textShadow: "0 2px 12px rgba(0,0,0,.6)",
              }}>{t}</div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (k === "rules5") {
    const list = items as string[];
    return (
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 150 * u }}>
        <div style={{ textAlign: "left", fontFamily: FONT_SANS, color: "#f4f7f2", opacity: s }}>
          <div style={{ fontWeight: 800, fontSize: 56 * u, letterSpacing: 4 * u, textAlign: "center", color: "#ffe8a3", marginBottom: 22 * u }}>{String(panel.title ?? "")}</div>
          {list.map((t, i) => {
            const on = i < reveal;
            return (
              <div key={i} style={{ fontSize: 44 * u, fontWeight: 600, margin: `${10 * u}px 0`, opacity: on ? 1 : 0.18, transition: "none" }}>
                {i + 1}. {t}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (k === "scale") {
    const tilt = Math.sin(frame / 40) * 4;
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 220 * u }}>
        <div style={{ display: "flex", alignItems: "center", gap: 80 * u, transform: `rotate(${tilt}deg)`, opacity: s }}>
          <Card s={1} style={{ padding: `${30 * u}px ${44 * u}px`, fontSize: 40 * u, fontWeight: 700, maxWidth: 520 * u, textAlign: "center" }}>{String(panel.left ?? "")}</Card>
          <div style={{ fontSize: 80 * u, color: "#ffd27a" }}>⚖</div>
          <Card s={1} style={{ padding: `${30 * u}px ${44 * u}px`, fontSize: 40 * u, fontWeight: 700, maxWidth: 520 * u, textAlign: "center" }}>{String(panel.right ?? "")}</Card>
        </div>
      </AbsoluteFill>
    );
  }

  return null;
};
