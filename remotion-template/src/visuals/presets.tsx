import React from "react";
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { FONT_SANS, H, W, lerp, ramp, rnd } from "../util";
import { Book3D, GrowingTree } from "./Book";
import { BabyBasket, Figure } from "./Figure";
import {
  Bamboo, Birds, CoffeeHills, Fireflies, Ground, Mist, Moon, Pine, Rain, Ranges, Rays, River, Sky, Stars, Sun,
  Terraces, Tree,
} from "./Nature";
import {
  Brocade, Bridge, Chalkboard, City, Desk, Drum, Flag, Hut, Lamp, Lanterns, Longhouse, OpenBook, Pouch, School,
  StiltHouse,
} from "./Props";
import { useSeg } from "./seg";

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      {children}
    </svg>
  </AbsoluteFill>
);

const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)` }} />
);

/** Slow camera push-in for the whole layer. */
const Push: React.FC<{ children: React.ReactNode; from?: number; to?: number; ox?: string; oy?: string }> = ({
  children, from = 1, to = 1.08, ox = "50%", oy = "60%",
}) => {
  const { p } = useSeg();
  return <AbsoluteFill style={{ transform: `scale(${lerp(from, to, p)})`, transformOrigin: `${ox} ${oy}` }}>{children}</AbsoluteFill>;
};

// =============================================================== PHẦN 1
const Taybac: React.FC = () => {
  const { p } = useSeg();
  return (
    <Push>
      <Svg>
        <Sky name="dawn" id="tb" />
        <Sun x={1350} y0={760} y1={430} r={60} id="tb" color="#fff0c9" />
        <Birds y={250} />
        <Ranges sky="dawn" seed="tb" top={520} />
        <Mist y={640} color="#ffe4c4" opacity={0.35} />
        <Terraces x={-40} y={720} w={980} h={360} />
        <StiltHouse x={1250} y={800} s={0.9} color="#1d1622" light={0.4 * (1 - p)} />
        <StiltHouse x={1460} y={830} s={0.7} color="#1d1622" light={0.4 * (1 - p)} />
        <StiltHouse x={1650} y={815} s={0.8} color="#1d1622" />
        <Mist y={900} color="#ffffff" opacity={0.2} seed="m2" />
        <Ground y={1010} color="#120e1c" curve={30} />
      </Svg>
      <Vignette strength={0.4} />
    </Push>
  );
};

const DrumScene: React.FC = () => {
  const { f, fps } = useSeg();
  const t = f / fps;
  const hit = [0, 0.95, 1.9].reduce((m, h) => Math.max(m, t >= h ? Math.exp(-(t - h) * 5) : 0), 0);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 55%, #5c1408 0%, #1a0603 60%, #070202 100%)" }}>
      <Svg>
        <Brocade y={40} opacity={0.5} />
        <Brocade y={H - 86} opacity={0.5} />
        <Drum x={W / 2} y={H / 2 + 40} r={250} hit={hit} />
      </Svg>
    </AbsoluteFill>
  );
};

const Festival: React.FC = () => {
  const { f } = useSeg();
  const dancers = 11;
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="dusk" id="fs" />
        <Sun x={960} y0={720} y1={700} r={90} id="fs" color="#ffd38a" glow={1.2} />
        <Ranges sky="dusk" seed="fs" top={560} layers={3} speed={0.6} />
        <Lanterns y={120} />
        <Ground y={860} color="#2a1020" curve={-20} />
        <ellipse cx={960} cy={930} rx={620} ry={90} fill="#ff9f43" opacity={0.18} />
        {/* xòe circle */}
        {Array.from({ length: dancers }).map((_, i) => {
          const a = (i / dancers) * Math.PI * 2 + f / 120;
          const x = 960 + Math.cos(a) * 520;
          const y = 930 + Math.sin(a) * 70;
          const s = 0.75 + (Math.sin(a) + 1) * 0.15;
          return <Figure key={i} x={x} y={y} s={s} color="#160812" pose="dance" skirt={i % 2 === 0} hair={i % 2 === 0 ? "bun" : "short"} phase={i} />;
        }).sort(() => 0)}
        {/* còn balls flying */}
        {Array.from({ length: 4 }).map((_, i) => {
          const T = 70;
          const k = ((f + i * 23) % T) / T;
          const x0 = 200 + i * 450;
          const x = x0 + k * 380;
          const y = 760 - Math.sin(k * Math.PI) * 420;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={14} fill="#e63946" />
              <path d={`M${x},${y} q-30,20 -60,${10 + Math.sin(f / 5 + i) * 10}`} stroke="#f4d35e" strokeWidth={4} fill="none" />
            </g>
          );
        })}
        <Fireflies n={50} color="#ffcf7a" y0={300} y1={1000} rise={1.2} size={3} seed="spark" />
        <Brocade y={H - 46} h={46} opacity={0.9} shift={f * 0.8} />
      </Svg>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

const Stage: React.FC = () => {
  const { f } = useSeg();
  const spots = [560, 960, 1360];
  return (
    <AbsoluteFill style={{ background: "#05040a" }}>
      <Svg>
        <defs>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff7d6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff7d6" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="pool">
            <stop offset="0" stopColor="#fff2c6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff2c6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="led" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1c1440" />
            <stop offset="1" stopColor="#3a1a3d" />
          </linearGradient>
        </defs>
        <rect x={140} y={60} width={W - 280} height={640} rx={12} fill="url(#led)" opacity={0.6} />
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={i} x1={140 + i * 92} y1={60} x2={140 + i * 92} y2={700} stroke="#000" strokeOpacity={0.25} />
        ))}
        <rect x={0} y={760} width={W} height={320} fill="#120d1c" />
        {spots.map((x, i) => {
          const sway = Math.sin(f / 60 + i) * 14;
          return (
            <g key={i}>
              <path d={`M${x + sway - 30},-20 L${x + sway + 30},-20 L${x + 170},900 L${x - 170},900 Z`} fill="url(#beam)" />
              <ellipse cx={x} cy={900} rx={220} ry={50} fill="url(#pool)" />
            </g>
          );
        })}
        <Fireflies n={40} color="#e9e1ff" y0={0} y1={900} rise={0.2} size={2} seed="haze" />
      </Svg>
      <Vignette strength={0.6} />
    </AbsoluteFill>
  );
};

const HoaPhu: React.FC = () => (
  <Push>
    <Svg>
      <Sky name="day" id="hp" />
      <Sun x={1500} y0={260} y1={230} r={55} id="hp" color="#fffbe8" glow={0.8} />
      <Birds y={200} n={5} seed="hp" />
      <Ranges sky="day" seed="hp" top={600} layers={2} speed={0.5} />
      <CoffeeHills y={760} />
      <River y={850} />
      <Longhouse x={1450} y={830} s={0.75} color="#3a2416" />
      <Tree x={260} y={880} s={1.1} color="#2d5a2d" />
      <Tree x={1820} y={900} s={1.3} color="#24502a" />
      <Ground y={1030} color="#2b4a24" curve={20} />
    </Svg>
    <Vignette strength={0.3} />
  </Push>
);

const SchoolScene: React.FC<{ night?: boolean }> = ({ night }) => (
  <Push to={1.06}>
    <Svg>
      <Sky name={night ? "night" : "day"} id="sc" />
      {night ? <Stars /> : <Sun x={300} y0={220} y1={200} r={50} id="sc" glow={0.7} />}
      <Ranges sky={night ? "night" : "day"} seed="sc" top={560} layers={2} speed={0.3} />
      <Ground y={840} color={night ? "#0e1320" : "#7fae5a"} curve={10} />
      <School x={960} y={840} s={1.05} night={night} />
      <Flag x={1600} y={860} pole={480} w={170} />
      <Tree x={170} y={900} s={1.4} color={night ? "#0a1410" : "#2f6b35"} />
      <Tree x={1820} y={930} s={1.2} color={night ? "#0a1410" : "#2b5f31"} />
      <rect x={0} y={900} width={W} height={180} fill={night ? "#0b0f19" : "#c9b48a"} />
      {!night ? [700, 820, 1140, 1260].map((x, i) => (
        <Figure key={i} x={x} y={990} s={0.55} color="#24324f" pose={i % 2 ? "wave" : "walk"} bag phase={i} speed={0.3} />
      )) : null}
    </Svg>
    <Vignette strength={0.3} />
  </Push>
);

const Reading: React.FC = () => {
  const { f } = useSeg();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 70%, #3a2614 0%, #160d07 60%, #070403 100%)" }}>
      <Svg>
        <Fireflies n={60} color="#ffe2a0" y0={80} y1={820} rise={0.6} size={3} seed="rd" />
        {Array.from({ length: 22 }).map((_, i) => {
          const k = ((f * 0.5 + i * 37) % 600) / 600;
          const x = 960 + (rnd("lt", i) - 0.5) * 900 * k;
          const y = 760 - k * 640;
          const ch = "ABCDEGHIKLMNOPQRSTUVXY"[i % 22];
          return <text key={i} x={x} y={y} fontFamily={FONT_SANS} fontWeight={700} fontSize={30 + rnd("lt", i + 5) * 30}
            fill="#ffe6ad" opacity={(1 - k) * 0.7}>{ch}</text>;
        })}
        <OpenBook x={960} y={960} s={1.5} glow={1} flip={((f % 240) / 240) * 1.2 - 0.1} />
      </Svg>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

const Contest: React.FC = () => {
  const { f } = useSeg();
  return (
    <AbsoluteFill style={{ background: "#0a0612" }}>
      <Svg>
        <defs>
          <linearGradient id="curtain" x1="0" x2="1">
            <stop offset="0" stopColor="#5e0b16" />
            <stop offset="0.5" stopColor="#a0182b" />
            <stop offset="1" stopColor="#5e0b16" />
          </linearGradient>
        </defs>
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x={i * 60} y={0} width={60} height={H} fill="url(#curtain)" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={`r${i}`} x={W - (i + 1) * 60} y={0} width={60} height={H} fill="url(#curtain)" />
        ))}
        <path d={`M0,0 L${W},0 L${W},110 Q${W / 2},190 0,110 Z`} fill="#7d1020" />
        <Brocade y={96} h={30} opacity={0.9} />
        <rect x={360} y={860} width={W - 720} height={220} fill="#1b1028" />
        {[0, 1, 2, 3].map((i) => {
          const a = Math.sin(f / 50 + i * 1.7) * 18;
          const x = 420 + i * 360;
          return <path key={i} d={`M${x},1080 L${x - 60},0 L${x + 60},0 Z`} fill="#ffe7b0" opacity={0.08}
            transform={`rotate(${a} ${x} 1080)`} />;
        })}
        <Fireflies n={50} color="#ffe2a8" y0={100} y1={900} rise={0.3} size={3} seed="ct" />
      </Svg>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

const MONTAGE: [string, React.FC][] = [];

const Montage: React.FC = () => {
  const { f, dur } = useSeg();
  const { width, height } = useVideoConfig();
  const u = Math.min(width / 1920, height / 1080);
  const n = MONTAGE.length;
  const per = dur / n;
  const labels = ["Hòa Phú", "Văn hóa", "Con người", "Trẻ em", "Trường học", "Thiên nhiên"];
  return (
    <AbsoluteFill>
      {MONTAGE.map(([key, C], i) => {
        const from = i * per;
        const local = f - from;
        if (local < -20 || local > per + 20) return null;
        const o = interpolate(local, [-20, 0, per, per + 20], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <AbsoluteFill key={key} style={{ opacity: o, transform: `scale(${1.02 + 0.06 * (local / per)})` }}>
            <C />
            <div style={{
              position: "absolute", left: 90 * u, top: 110 * u, fontFamily: FONT_SANS, fontWeight: 800, fontSize: 40 * u, color: "#fff",
              letterSpacing: 6 * u, textTransform: "uppercase", textShadow: "0 4px 20px rgba(0,0,0,.6)",
              borderLeft: `${8 * u}px solid #f2b544`, paddingLeft: 20 * u,
            }}>{labels[i]}</div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

const Emblem: React.FC = () => {
  const { f, p } = useSeg();
  const rings = [430, 360, 290, 220];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #3d1a0a 0%, #120703 65%, #050201 100%)" }}>
      <Svg>
        <Rays x={W / 2} y={H / 2} n={24} color="#ffd27a" opacity={0.1} />
        {rings.map((r, k) => {
          const n = 16 + k * 4;
          const rot = (k % 2 ? -1 : 1) * f * (0.15 + k * 0.05);
          return (
            <g key={k} transform={`rotate(${rot} ${W / 2} ${H / 2})`} opacity={0.35 + 0.65 * ramp(p, 0, 0.2 + k * 0.1)}>
              <circle cx={W / 2} cy={H / 2} r={r} fill="none" stroke={["#f2b544", "#b5172b", "#1a7f6b", "#f2b544"][k]} strokeWidth={6} />
              {Array.from({ length: n }).map((_, i) => {
                const a = (i / n) * Math.PI * 2;
                const cx = W / 2 + Math.cos(a) * r;
                const cy = H / 2 + Math.sin(a) * r;
                const s = 16 - k * 2;
                return <path key={i} d={`M${cx},${cy - s} L${cx + s},${cy} L${cx},${cy + s} L${cx - s},${cy} Z`}
                  fill={["#f2b544", "#e63946", "#2ec4b6", "#ffe8a3"][(i + k) % 4]} />;
              })}
            </g>
          );
        })}
        <circle cx={W / 2} cy={H / 2} r={170} fill="#1a0b05" stroke="#f2b544" strokeWidth={5} />
      </Svg>
    </AbsoluteFill>
  );
};

const Blackout: React.FC = () => <AbsoluteFill style={{ background: "#000" }} />;

const PartCard: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #1c2140 0%, #070912 65%, #020205 100%)" }}>
    <Svg>
      <Fireflies n={90} color="#ffd27a" y0={0} y1={H} rise={0.5} size={2.6} seed="pc" />
      <Brocade y={H - 60} h={40} opacity={0.6} />
    </Svg>
  </AbsoluteFill>
);

// =============================================================== PHẦN 2 — sách
/** Road snaking up a mountain with a small walking figure. */
const Road: React.FC = () => {
  const { p } = useSeg();
  const pt = (t: number) => {
    const y = 1060 - t * 600;
    const x = 960 + Math.sin(t * Math.PI * 3.2) * (520 - t * 380);
    return [x, y];
  };
  let d = "";
  for (let i = 0; i <= 80; i++) {
    const [x, y] = pt(i / 80);
    d += `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const [fx, fy] = pt(0.12 + p * 0.3);
  return (
    <Push>
      <Svg>
        <Sky name="dawn" id="rd" />
        <Sun x={600} y0={600} y1={380} r={50} id="rd" />
        <Ranges sky="dawn" seed="road" top={420} layers={3} speed={0.4} />
        <path d={`M0,1080 L0,560 Q960,380 1920,560 L1920,1080 Z`} fill="#2b2338" />
        <path d={d} stroke="#c99a6a" strokeWidth={34} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        <path d={d} stroke="#e8c39a" strokeWidth={4} strokeDasharray="18 22" fill="none" opacity={0.5} />
        <Figure x={fx} y={fy} s={0.42 + (1060 - fy) / -3000} color="#120d18" pose="walk" bag carry="book" speed={0.6} />
        <Mist y={700} color="#ffd8c0" opacity={0.25} seed="rdm" />
        {[120, 260, 1700, 1820].map((x, i) => <Pine key={i} x={x} y={1080} s={1.5 + (i % 2) * 0.3} color="#120d18" />)}
      </Svg>
      <Vignette />
    </Push>
  );
};

const Stream: React.FC = () => {
  const { p } = useSeg();
  const x = lerp(520, 1420, p);
  const stones = [600, 760, 920, 1080, 1240, 1400];
  const near = stones.reduce((m, s) => (Math.abs(s - x) < Math.abs(m - x) ? s : m), stones[0]);
  const hop = Math.max(0, 1 - Math.abs(near - x) / 80);
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="day" id="st" />
        <Ranges sky="day" seed="stm" top={500} layers={2} speed={0.3} />
        <path d="M0,700 Q960,640 1920,700 L1920,1080 L0,1080 Z" fill="#355e3b" />
        <River y={820} color="#5b9cc0" />
        {stones.map((s, i) => <ellipse key={i} cx={s} cy={890 + (i % 2) * 14} rx={62} ry={20} fill="#6f6a63" />)}
        <Figure x={x} y={885 - (1 - hop) * 26} s={0.85} color="#1a1f2b" pose="walk" bag carry="book" speed={0.5} />
        {[90, 230, 1700, 1830].map((xx, i) => <Bamboo key={i} x={xx} y={1080} h={560} color="#24402a" />)}
      </Svg>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

const HillClass: React.FC = () => {
  const { f } = useSeg();
  return (
    <Push to={1.05}>
      <Svg>
        <Sky name="day" id="hc" />
        <Sun x={1500} y0={230} y1={220} r={46} id="hc" glow={0.7} />
        <Ranges sky="day" seed="hcl" top={560} layers={3} speed={0.4} />
        <Mist y={640} opacity={0.3} seed="hcm" />
        <path d="M0,800 Q700,690 1920,780 L1920,1080 L0,1080 Z" fill="#4c7a3d" />
        <Hut x={980} y={800} s={1.25} />
        <Flag x={1280} y={810} pole={300} w={110} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Figure key={i} x={600 + i * 120 + Math.sin(f / 40 + i) * 20} y={930} s={0.5} color="#22301f"
            pose={i % 2 ? "wave" : "stand"} bag phase={i} />
        ))}
        <Figure x={1180} y={930} s={0.75} color="#1c2617" pose="hold" carry="book" />
        {[100, 1820].map((x, i) => <Tree key={i} x={x} y={980} s={1.4} color="#244a26" />)}
      </Svg>
      <Vignette strength={0.3} />
    </Push>
  );
};

const LampDesk: React.FC = () => {
  const { f } = useSeg();
  return (
    <AbsoluteFill style={{ background: "#07060a" }}>
      <Svg>
        <rect x={1180} y={120} width={520} height={420} fill="#0b1730" />
        <Stars n={60} maxY={540} seed="ld" />
        <Moon x={1560} y={230} r={40} />
        <path d="M1180,540 L1300,400 L1420,470 L1560,360 L1700,450 L1700,540 Z" fill="#0d1526" />
        <rect x={1170} y={110} width={540} height={440} fill="none" stroke="#2a1d12" strokeWidth={22} />
        <line x1={1440} y1={110} x2={1440} y2={550} stroke="#2a1d12" strokeWidth={14} />
        <Backlight x={700} y={640} rx={520} ry={420} color="#ffcf8a" o={0.22} />
        <Desk x={760} y={780} w={1100} />
        <Lamp x={1080} y={780} s={1} />
        <rect x={400} y={735} width={210} height={46} fill="#7a3b22" />
        <rect x={410} y={700} width={190} height={36} fill="#2f4f7a" />
        <OpenBook x={760} y={786} s={0.6} />
        <Figure x={580} y={1000} s={1.6} color="#05040a" pose="sit" facing={1} />
        <line x1={640} y1={770} x2={700 + Math.sin(f / 6) * 12} y2={760} stroke="#05040a" strokeWidth={18} strokeLinecap="round" />
      </Svg>
      <Vignette strength={0.7} />
    </AbsoluteFill>
  );
};

const TeacherKids: React.FC = () => {
  const { f } = useSeg();
  const n = 7;
  return (
    <Push>
      <Svg>
        <Sky name="dusk" id="tk" />
        <Sun x={960} y0={720} y1={690} r={110} id="tk" color="#ffd89a" glow={1.3} />
        <Ranges sky="dusk" seed="tkr" top={600} layers={2} speed={0.3} />
        <path d="M0,820 Q960,760 1920,820 L1920,1080 L0,1080 Z" fill="#1d0f24" />
        <Tree x={1480} y={840} s={2.2} color="#1d0f24" />
        {Array.from({ length: n }).map((_, i) => {
          const a = (i / n) * Math.PI * 2 + f / 200;
          return <Figure key={i} x={900 + Math.cos(a) * 260} y={900 + Math.sin(a) * 40} s={0.55 + (Math.sin(a) + 1) * 0.05}
            color="#1d0f24" pose="dance" phase={i} speed={0.5} />;
        })}
        <Figure x={900} y={900} s={0.95} color="#1d0f24" pose="wave" />
        <Fireflies n={30} color="#ffe3b0" y0={500} y1={1000} rise={0.3} size={2.5} seed="tkf" />
      </Svg>
      <Vignette strength={0.4} />
    </Push>
  );
};

const LampScene: React.FC = () => (
  <Push from={1.0} to={1.1} oy="70%">
    <Svg>
      <Sky name="night" id="lp" />
      <Stars n={220} />
      <Moon x={300} y={180} r={36} />
      <Ranges sky="night" seed="lpr" top={540} layers={3} speed={0.3} />
      <Mist y={760} color="#7fa0d6" opacity={0.18} seed="lpm" />
      <path d="M0,900 Q960,840 1920,900 L1920,1080 L0,1080 Z" fill="#04060c" />
      <Lamp x={960} y={930} s={1.15} />
      <Fireflies n={40} color="#ffd27a" y0={420} y1={980} rise={0.4} size={3} seed="lpf" />
    </Svg>
    <Vignette strength={0.5} />
  </Push>
);

const BookScene: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 48%, #2b2140 0%, #0d0a18 60%, #040309 100%)" }}>
    <Svg>
      <Rays x={W / 2} y={H / 2} n={20} color="#ffe3a8" opacity={0.07} />
      <Fireflies n={70} color="#ffd98f" y0={0} y1={H} rise={0.5} size={2.6} seed="bk" />
    </Svg>
    <Book3D x="83%" y="48%" width={340} />
  </AbsoluteFill>
);

const RainNight: React.FC = () => (
  <AbsoluteFill>
    <Svg>
      <Sky name="rain" id="rn" />
      <Ranges sky="rain" seed="rnr" top={520} layers={2} speed={0.2} />
      <path d="M0,820 Q960,780 1920,820 L1920,1080 L0,1080 Z" fill="#070a10" />
      <Hut x={960} y={830} s={2.1} light={0.9} color="#24180f" />
      <path d="M560,830 L1360,830 L1360,850 L560,850 Z" fill="#1a110a" />
      <BabyBasket x={760} y={826} s={0.8} />
      <Rain n={220} opacity={0.4} />
      <rect x={0} y={1000} width={W} height={80} fill="#0a0e15" />
    </Svg>
    <Vignette strength={0.6} />
  </AbsoluteFill>
);

/** Soft light behind silhouettes so they stay readable on dark scenes. */
const Backlight: React.FC<{ x: number; y: number; rx?: number; ry?: number; color?: string; o?: number }> = ({
  x, y, rx = 700, ry = 260, color = "#9fb8d8", o = 0.35,
}) => (
  <>
    <defs>
      <radialGradient id={`bl-${x}-${y}`}>
        <stop offset="0" stopColor={color} stopOpacity={o} />
        <stop offset="1" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#bl-${x}-${y})`} />
  </>
);

const Carry: React.FC = () => {
  const { p } = useSeg();
  const x = lerp(300, 1500, p);
  const y = 900 - Math.sin(p * Math.PI) * 30;
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="rain" id="cr" />
        <Ranges sky="rain" seed="crr" top={500} layers={3} speed={0.3} />
        <Backlight x={x} y={760} rx={600} ry={300} o={0.4} />
        <path d="M0,880 Q960,840 1920,900 L1920,1080 L0,1080 Z" fill="#0b1018" />
        <g>
          <Figure x={x} y={y + 20} s={1.1} color="#0c0f16" pose="walk" carry="child" speed={0.5} />
          <path d={`M${x - 120},${y - 230} Q${x - 20},${y - 300} ${x + 90},${y - 220} L${x + 60},${y - 120} Q${x - 30},${y - 170} ${x - 110},${y - 120} Z`}
            fill="#a9c7e8" opacity={0.28} />
        </g>
        <Rain n={240} opacity={0.42} lightning={false} />
      </Svg>
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

const GrowUp: React.FC = () => {
  const { p } = useSeg();
  const stages = [0.42, 0.62, 0.86];
  return (
    <Push to={1.04}>
      <Svg>
        <Sky name="dawn" id="gu" />
        <Sun x={1500} y0={700} y1={380} r={60} id="gu" />
        <Ranges sky="dawn" seed="gur" top={560} layers={3} speed={0.3} />
        <path d="M0,860 Q960,800 1920,860 L1920,1080 L0,1080 Z" fill="#1c1830" />
        <Hut x={400} y={870} s={0.9} color="#2a1d2a" />
        <Figure x={820} y={950} s={1.05} color="#120e1e" pose="stand" />
        {stages.map((s, i) => {
          const o = ramp(p, i * 0.28, i * 0.28 + 0.12) * (i < 2 ? 1 - ramp(p, i * 0.28 + 0.3, i * 0.28 + 0.4) : 1);
          return <Figure key={i} x={980 + i * 30} y={950} s={s} color="#120e1e" pose={i === 2 ? "read" : "stand"} bag={i < 2}
            carry={i === 2 ? "book" : undefined} facing={-1} glow={o > 0.5 ? "#ffd27a" : undefined} />;
        }).map((el, i) => <g key={i} opacity={ramp(p, i * 0.28, i * 0.28 + 0.12) * (i < 2 ? 1 - ramp(p, i * 0.28 + 0.3, i * 0.28 + 0.4) : 1)}>{el}</g>)}
      </Svg>
      <Vignette strength={0.35} />
    </Push>
  );
};

const DangTam: React.FC = () => {
  const { p } = useSeg();
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="dusk" id="dt" />
        <Ranges sky="dusk" seed="dtr" top={600} layers={2} speed={0.2} />
        <path d="M0,880 Q960,830 1920,880 L1920,1080 L0,1080 Z" fill="#1d0f24" />
        <GrowingTree x={1060} y={890} s={1.15} g={0.25 + 0.75 * ramp(p, 0, 0.8)} fruit={ramp(p, 0.75, 0.95)} />
        <Figure x={700} y={910} s={0.95} color="#140a18" pose="reach" facing={1} />
        <Fireflies n={30} color="#ffd27a" y0={300} y1={900} rise={0.3} size={3} seed="dtf" />
      </Svg>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

const CityRoad: React.FC = () => {
  const { p } = useSeg();
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="dusk" id="cty" />
        <City x={0} y={780} w={760} color="#25132e" />
        <Ranges sky="dusk" seed="ctyr" top={600} layers={2} speed={0.2} />
        <path d="M0,800 L1920,760 L1920,1080 L0,1080 Z" fill="#160b1c" />
        <path d="M200,1080 C600,900 900,880 1300,820 S1800,760 1920,750" stroke="#6a4a5a" strokeWidth={60} fill="none" />
        <Figure x={lerp(500, 1200, p)} y={lerp(980, 860, p)} s={lerp(1, 0.7, p)} color="#0d060f" pose="walk" skirt hair="long" speed={0.5} />
      </Svg>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

const Mother: React.FC = () => {
  const { p } = useSeg();
  const step = ramp(p, 0.15, 0.4);
  const back = ramp(p, 0.42, 0.6);
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="dusk" id="mo" />
        <Ranges sky="dusk" seed="mor" top={540} layers={2} speed={0.15} />
        <path d="M0,860 Q960,820 1920,860 L1920,1080 L0,1080 Z" fill="#170b1d" />
        <Hut x={1500} y={870} s={1} color="#2a1525" light={0.6} />
        <Figure x={1300} y={930} s={0.8} color="#0e0612" pose="stand" />
        <Figure x={lerp(420, 720, step)} y={960} s={1.02} color="#0e0612" pose={step > 0 && step < 1 ? "walk" : "reach"} skirt hair="long" speed={0.4} />
        <Figure x={lerp(1000, 1100, back)} y={960} s={0.95} color="#0e0612" pose="stand" facing={-1} />
      </Svg>
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

const Vigil: React.FC = () => (
  <AbsoluteFill style={{ background: "#030306" }}>
    <Svg>
      <defs>
        <radialGradient id="vg">
          <stop offset="0" stopColor="#ffd7a0" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ffd7a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={360} y={140} width={360} height={300} fill="#0b1730" />
      <Stars n={40} maxY={440} seed="vgs" />
      <Moon x={560} y={240} r={34} />
      <rect x={350} y={130} width={380} height={320} fill="none" stroke="#1c140c" strokeWidth={20} />
      <path d={`M960,-50 L1300,1000 L620,1000 Z`} fill="url(#vg)" />
      <Desk x={960} y={800} w={760} color="#20150c" />
      <Lamp x={1180} y={800} s={0.8} />
      <Figure x={840} y={1010} s={1.55} color="#020203" pose="sit" />
    </Svg>
    <Vignette strength={0.7} />
  </AbsoluteFill>
);

const Fall: React.FC = () => {
  const { p } = useSeg();
  const childX = p < 0.55 ? lerp(900, 1500, ramp(p, 0, 0.35)) : lerp(1500, 1180, ramp(p, 0.55, 0.75));
  const teachX = lerp(500, 1080, ramp(p, 0.1, 0.45));
  const fall = ramp(p, 0.45, 0.52) * (1 - ramp(p, 0.78, 0.95));
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="rain" id="fl" />
        <Ranges sky="rain" seed="flr" top={520} layers={2} speed={0.2} />
        <Backlight x={1000} y={780} rx={900} ry={320} o={0.42} />
        <path d="M0,840 L1920,960 L1920,1080 L0,1080 Z" fill="#0a0e15" />
        <Figure x={childX} y={lerp(870, 960, childX / 1920)} s={0.92} color="#06080c" pose={p < 0.35 || (p > 0.55 && p < 0.75) ? "run" : "stand"}
          facing={p < 0.55 ? 1 : -1} speed={0.6} />
        <Figure x={teachX} y={lerp(870, 960, teachX / 1920) + fall * 40} s={1.05} color="#06080c"
          pose={p < 0.45 ? "run" : fall > 0.5 ? "kneel" : "stand"} rot={fall * 50} speed={0.5} />
        <Rain n={240} opacity={0.42} />
      </Svg>
      <Vignette strength={0.6} />
    </AbsoluteFill>
  );
};

const Farewell: React.FC = () => {
  const { p } = useSeg();
  const walk = ramp(p, 0.1, 1);
  const pathPt = (t: number) => [lerp(1000, 1620, t), lerp(930, 640, t)];
  const [cx, cy] = pathPt(walk);
  const sc = lerp(0.9, 0.35, walk);
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="dawn" id="fw" />
        <Sun x={1650} y0={640} y1={420} r={70} id="fw" color="#fff0c4" />
        <Rays x={1650} y={480} n={16} opacity={0.08} />
        <Ranges sky="dawn" seed="fwr" top={480} layers={3} speed={0.2} />
        <path d="M0,760 Q600,720 1920,640 L1920,1080 L0,1080 Z" fill="#241c33" />
        <path d="M820,1080 C1000,920 1300,780 1660,640" stroke="#8c6f7a" strokeWidth={70} fill="none" opacity={0.6} />
        {[150, 250, 340, 430, 520].map((x, i) => (
          <Figure key={i} x={x} y={900 + (i % 2) * 20} s={0.6} color="#120c1c" pose={i % 2 ? "wave" : "stand"} phase={i} facing={1} />
        ))}
        <Figure x={760} y={960} s={1.15} color="#0b0812" pose="stand" />
        <Figure x={cx} y={cy} s={sc} color="#0b0812" pose="walk" facing={1} carry="pouch" speed={0.45} />
        <Figure x={cx + 70 * sc} y={cy} s={sc * 1.05} color="#0b0812" pose="walk" skirt hair="long" speed={0.45} />
        <Mist y={760} color="#ffd8c8" opacity={0.25} seed="fwm" />
      </Svg>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

const Seeds: React.FC = () => {
  const { p } = useSeg();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 70%, #3a2412 0%, #120a05 60%, #050302 100%)" }}>
      <Svg>
        <Fireflies n={80} color="#ffd27a" y0={60} y1={800} rise={1} size={4} seed="sd" />
        <Pouch x={960} y={980} s={1.25} open={ramp(p, 0, 0.3)} />
      </Svg>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

const Stories: React.FC = () => {
  const { f } = useSeg();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 30% 60%, #2e2014 0%, #100a06 70%)" }}>
      <Svg>
        <OpenBook x={520} y={900} s={1.3} glow={0.8} flip={((f % 180) / 180) * 1.2 - 0.1} />
        <Fireflies n={40} color="#ffe2a0" y0={100} y1={850} rise={0.4} size={3} seed="sto" />
      </Svg>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};

const Teachers: React.FC = () => {
  const { p } = useSeg();
  return (
    <AbsoluteFill style={{ background: "#1a1410" }}>
      <Svg>
        <rect width={W} height={H} fill="#2b231c" />
        <Chalkboard x={330} y={160} w={1260} h={520} lines={5} progress={ramp(p, 0, 0.8)} />
        <rect x={0} y={840} width={W} height={240} fill="#3a2a1c" />
        <rect x={820} y={700} width={280} height={180} fill="#5a3a22" />
        <Figure x={1300} y={900} s={1.25} color="#0e0a08" pose="reach" facing={-1} />
        <Figure x={500} y={1080} s={0.9} color="#0a0705" pose="stand" />
        <Figure x={640} y={1080} s={0.85} color="#0a0705" pose="stand" hair="long" />
        <Figure x={1600} y={1080} s={0.9} color="#0a0705" pose="stand" />
      </Svg>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

const Sunrise: React.FC = () => (
  <Push>
    <Svg>
      <Sky name="dawn" id="sr" />
      <Sun x={960} y0={820} y1={420} r={90} id="sr" color="#fff2cc" glow={1.4} />
      <Rays x={960} y={470} n={22} opacity={0.12} />
      <Birds y={260} n={7} seed="srb" />
      <Ranges sky="dawn" seed="srr" top={560} layers={4} speed={0.3} />
      <Mist y={760} color="#ffe2c8" opacity={0.3} seed="srm" />
    </Svg>
    <Vignette strength={0.3} />
  </Push>
);

// =============================================================== PHẦN 3 — năng khiếu
const KidsRoad: React.FC = () => {
  const { f } = useSeg();
  const kids = 6;
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="dawn" id="kr" />
        <Sun x={1450} y0={600} y1={360} r={70} id="kr" />
        <Birds y={240} seed="krb" />
        <Ranges sky="dawn" seed="krr" top={500} layers={3} speed={0.3} />
        <Terraces x={1100} y={640} w={900} h={300} colors={["#6f8f3a", "#a99a44"]} seed="krt" />
        <path d="M0,780 Q500,760 820,800 L820,1080 L0,1080 Z" fill="#2c2a3e" />
        <path d="M1240,800 Q1500,770 1920,790 L1920,1080 L1240,1080 Z" fill="#2c2a3e" />
        <River y={900} color="#6aa9cc" />
        <Bridge x={800} y={840} w={460} />
        {Array.from({ length: kids }).map((_, i) => {
          const T = 900;
          const k = ((f + i * 150) % T) / T;
          const x = lerp(-80, 2000, k);
          const onBridge = x > 800 && x < 1260;
          const by = onBridge ? 840 + 40 * 4 * ((x - 800) / 460) * (1 - (x - 800) / 460) * 0.5 : 790;
          return <Figure key={i} x={x} y={by} s={0.62} color="#1a1428" pose="walk" bag skirt={i % 2 === 1} hair={i % 2 ? "bun" : "short"} phase={i} speed={0.7} />;
        })}
        {[60, 1860].map((x, i) => <Bamboo key={i} x={x} y={1080} h={600} color="#1d1a2a" />)}
      </Svg>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};

const Schoolyard: React.FC = () => {
  const { f } = useSeg();
  const n = 10;
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="day" id="sy" />
        <Ranges sky="day" seed="syr" top={520} layers={2} speed={0.2} />
        <School x={960} y={700} s={0.9} />
        <rect x={0} y={700} width={W} height={380} fill="#d8c08f" />
        <ellipse cx={960} cy={920} rx={430} ry={90} fill="#c4a873" />
        <Flag x={1560} y={860} pole={520} w={160} />
        {Array.from({ length: n }).map((_, i) => {
          const a = (i / n) * Math.PI * 2 + f / 90;
          return <Figure key={i} x={960 + Math.cos(a) * 420} y={930 + Math.sin(a) * 90} s={0.55 + (Math.sin(a) + 1) * 0.06}
            color="#24324f" pose="walk" bag skirt={i % 2 === 0} hair={i % 2 ? "short" : "bun"} facing={Math.cos(a) > 0 ? -1 : 1} phase={i} />;
        }).sort((a, b) => Number(a.props.y) - Number(b.props.y))}
      </Svg>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

const Classroom: React.FC = () => {
  const { p } = useSeg();
  return (
  <AbsoluteFill style={{ background: "#e9dcc0" }}>
    <Svg>
      <rect width={W} height={H} fill="#efe3c6" />
      <rect x={0} y={760} width={W} height={320} fill="#b9925d" />
      <Chalkboard x={300} y={110} w={1320} h={560} lines={p > 0.45 ? 6 : 0} progress={ramp(p, 0.45, 0.95)} />
      <rect x={1660} y={160} width={180} height={320} fill="#9fc5e8" stroke="#7a5a3a" strokeWidth={14} />
      <Figure x={1720} y={900} s={1.2} color="#2a2018" pose="reach" facing={-1} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4].map((c) => {
          const x = 330 + c * 300 + (r % 2) * 40;
          const y = 900 + r * 80;
          return (
            <g key={`${r}-${c}`}>
              <circle cx={x} cy={y - 60} r={26 + r * 4} fill="#2a2018" />
              <path d={`M${x - 46 - r * 6},${y + 60} Q${x},${y - 50} ${x + 46 + r * 6},${y + 60} Z`} fill="#2a2018" />
            </g>
          );
        }),
      )}
      <rect x={180} y={1000} width={1560} height={80} fill="#7a5a3a" />
    </Svg>
  </AbsoluteFill>
  );
};

const Summit: React.FC = () => {
  const { f, p } = useSeg();
  const colors = ["#e63946", "#f4a261", "#2ec4b6", "#9b5de5", "#f2b544"];
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="dawn" id="sm" />
        <Rays x={960} y={360} n={26} opacity={0.15 + 0.1 * p} color="#fff4cf" />
        <Ranges sky="dawn" seed="smr" top={620} layers={2} speed={0.2} />
        {colors.map((c, i) => {
          let d = "";
          for (let k = 0; k <= 40; k++) {
            const x = (k / 40) * W;
            const y = 760 + i * 46 + Math.sin(x / 200 + f / 25 + i) * 40 - Math.exp(-(((x - 960) / 400) ** 2)) * 200;
            d += `${k ? "L" : "M"}${x.toFixed(0)},${y.toFixed(0)} `;
          }
          return <path key={i} d={d} stroke={c} strokeWidth={34} fill="none" opacity={0.75} strokeLinecap="round" />;
        })}
        <path d="M560,1080 L960,560 L1360,1080 Z" fill="#21182d" />
        <Figure x={900} y={600} s={0.9} color="#120b18" pose="up" carry="book" />
        <Figure x={1010} y={606} s={0.6} color="#120b18" pose="up" />
        <circle cx={955} cy={410} r={60 + 10 * Math.sin(f / 10)} fill="#fff4c9" opacity={0.9} />
        <circle cx={955} cy={410} r={180} fill="#ffe7a1" opacity={0.25} />
        <Fireflies n={50} color="#fff2c4" y0={100} y1={700} rise={0.8} size={3} seed="smf" />
      </Svg>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

const FlagScene: React.FC = () => {
  const { f } = useSeg();
  return (
    <AbsoluteFill>
      <Svg>
        <Sky name="day" id="fg" />
        <Rays x={960} y={-40} n={20} opacity={0.12} />
        <g transform="translate(560,90) scale(5)">
          <Flag x={0} y={160} pole={160} w={160} wave={1.6} />
        </g>
        <path d="M0,840 Q960,780 1920,840 L1920,1080 L0,1080 Z" fill="#2b2240" />
        {Array.from({ length: 13 }).map((_, i) => {
          const row = i < 6 ? 0 : i < 10 ? 1 : 2;
          const idx = row === 0 ? i : row === 1 ? i - 6 : i - 10;
          const cnt = row === 0 ? 6 : row === 1 ? 4 : 3;
          const x = 960 + (idx - (cnt - 1) / 2) * (240 - row * 40);
          const y = 1060 - row * 70;
          return <Figure key={i} x={x} y={y} s={0.9 - row * 0.1} color="#140d22" pose={i % 3 === 0 ? "up" : "wave"} carry={i % 2 ? "book" : undefined}
            skirt={i % 2 === 0} phase={i} />;
        })}
        {Array.from({ length: 60 }).map((_, i) => {
          const x = (rnd("cf", i) * W + Math.sin(f / 20 + i) * 30) % W;
          const y = ((rnd("cf", i + 1) * H + f * (2 + rnd("cf", i + 2) * 2)) % (H + 40)) - 20;
          return <rect key={i} x={x} y={y} width={10} height={16} fill={["#da251d", "#ffdd00", "#2ec4b6", "#ffffff"][i % 4]}
            transform={`rotate(${f * 3 + i * 20} ${x} ${y})`} opacity={0.85} />;
        })}
      </Svg>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

const LampBook: React.FC = () => (
  <AbsoluteFill>
    <Svg>
      <Sky name="night" id="lb" />
      <Stars n={200} />
      <Ranges sky="night" seed="lbr" top={540} layers={3} speed={0.2} />
      <path d="M0,880 Q960,830 1920,880 L1920,1080 L0,1080 Z" fill="#04060c" />
      <Lamp x={560} y={900} s={0.9} />
      <Figure x={1390} y={880} s={0.9} color="#04060c" pose="stand" />
      <Figure x={1470} y={884} s={0.6} color="#04060c" pose="stand" facing={-1} carry="pouch" />
      <Fireflies n={40} color="#ffd27a" y0={400} y1={950} rise={0.4} size={3} seed="lbf" />
    </Svg>
    <Book3D x="87%" y="40%" width={230} tilt={0.6} />
    <Vignette strength={0.5} />
  </AbsoluteFill>
);

MONTAGE.push(["hoaphu", HoaPhu], ["festival", Festival], ["teacherkids", TeacherKids], ["kidsroad", KidsRoad],
  ["school", () => <SchoolScene />], ["taybac", Taybac]);

export const VISUALS: Record<string, React.FC> = {
  taybac: Taybac, drum: DrumScene, festival: Festival, stage: Stage, hoaphu: HoaPhu, school: () => <SchoolScene />,
  schoolnight: () => <SchoolScene night />, reading: Reading, contest: Contest, montage: Montage, emblem: Emblem,
  blackout: Blackout, partcard: PartCard,
  road: Road, stream: Stream, hillclass: HillClass, lampdesk: LampDesk, teacherkids: TeacherKids, lamp: LampScene,
  book: BookScene, rainnight: RainNight, carry: Carry, growup: GrowUp, dangtam: DangTam, cityroad: CityRoad,
  mother: Mother, vigil: Vigil, fall: Fall, farewell: Farewell, seeds: Seeds, stories: Stories, teachers: Teachers,
  sunrise: Sunrise,
  kidsroad: KidsRoad, schoolyard: Schoolyard, classroom: Classroom, summit: Summit, flag: FlagScene, lampbook: LampBook,
};
