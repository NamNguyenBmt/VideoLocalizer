import React, { useMemo } from "react";
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { FilmGrain, GRADES, LensVignette, Letterbox, LightLeak, TransitionKind, transitionStyle } from "./fx";
import { SceneView } from "./Scene";
import { BigText, Captions, CueChip, LedText, PanelView, PartChip, SectionCard, SpeakerTag } from "./overlays";
import type { Panel, Scene, Timeline } from "./types";
import { PhotoLayer } from "./visuals/Book";
import { VISUALS } from "./visuals/presets";
import { SegContext } from "./visuals/seg";
import { rnd } from "./util";

const XF = 22; // khung hình hòa trộn giữa 2 nền
const MXF = 45; // khung hình hòa trộn nhạc
const IMPACT = new Set(["drum", "drum3", "gong", "impact"]);

type Resolved = Scene & {
  from: number; to: number; speechFrom: number; speechFrames: number;
  rVisual: string | null; rMusic: string | null; rAmb: string | null; rPanel: Panel | null; rGrade: string;
  rPart?: string; rSection?: { no?: string; title: string };
};

type Seg<T> = { value: T; from: number; to: number; first: number; last: number };

/** "visual", "music", "amb", "panel", "grade", "part" giữ nguyên tới khi một cảnh đổi chúng. */
function resolve(tl: Timeline): Resolved[] {
  const { fps, scenes } = tl;
  const total = Math.ceil(tl.duration * fps);
  let visual: string | null = null;
  let music: string | null = null;
  let amb: string | null = null;
  let panel: Panel | null = null;
  let grade = (tl.grade as string) ?? "film";
  let part: string | undefined;
  let section: { no?: string; title: string } | undefined;
  return scenes.map((s, i) => {
    if ("visual" in s) visual = s.visual ?? null;
    if ("music" in s) music = s.music && s.music !== "none" ? s.music : null;
    if ("amb" in s) amb = s.amb && s.amb !== "none" ? (s.amb as string) : null;
    if ("panel" in s) panel = s.panel ?? null;
    if (typeof s.grade === "string") grade = s.grade;
    if (s.part) { part = s.part; section = undefined; }
    if (s.section) section = s.section;
    const from = i === 0 ? 0 : Math.round(s.start * fps);
    const to = i + 1 < scenes.length ? Math.round(scenes[i + 1].start * fps) : total;
    const speechFrom = Math.round(s.start * fps) - from;
    const speech = s.speech ?? (s.text ? s.duration : 0);
    return {
      ...s, from, to: Math.max(from + 1, to), speechFrom, speechFrames: Math.round(speech * fps),
      rVisual: visual, rMusic: music, rAmb: amb, rPanel: panel, rGrade: grade, rPart: part, rSection: section,
    };
  });
}

function segments<T>(rs: Resolved[], key: (r: Resolved) => T): Seg<T>[] {
  const out: Seg<T>[] = [];
  rs.forEach((r, i) => {
    const v = key(r);
    const prev = out[out.length - 1];
    if (prev && JSON.stringify(prev.value) === JSON.stringify(v)) {
      prev.to = r.to;
      prev.last = i;
    } else {
      out.push({ value: v, from: r.from, to: r.to, first: i, last: i });
    }
  });
  return out;
}

/** Cảnh đang hiện ở khung `f` (tìm nhị phân). */
function sceneAt(rs: Resolved[], f: number): number {
  let lo = 0;
  let hi = rs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (rs[mid].from <= f) lo = mid; else hi = mid - 1;
  }
  return lo;
}

const audioSrc = (name: string) => staticFile(name.includes(".") ? name : `audio/${name}.mp3`);

type BgValue = { v: string | null; grade: string };

function pickTransition(rs: Resolved[], seg: Seg<BgValue>, prev: Seg<BgValue> | undefined, i: number): TransitionKind {
  const r = rs[seg.first];
  if (typeof r.transition === "string") return r.transition as TransitionKind;
  if (!prev) return "fade";
  const v = seg.value.v ?? "";
  const pv = prev.value.v ?? "";
  if (v.startsWith("@") || pv.startsWith("@") || v === "blackout" || pv === "blackout") return "fade";
  if (r.part) return "dip";
  if (r.section) return "leak";
  return (["fade", "zoom", "blur", "fade", "slide"] as TransitionKind[])[i % 5];
}

const Background: React.FC<{ seg: Seg<BgValue>; rs: Resolved[]; tl: Timeline; kind: TransitionKind | null }> = ({ seg, rs, tl, kind }) => {
  const frame = useCurrentFrame();
  const v = seg.value.v;
  let body: React.ReactNode;
  if (v && v.startsWith("@")) {
    body = <OffthreadVideo src={staticFile(v.slice(1))} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  } else if (v && VISUALS[v]) {
    const C = VISUALS[v];
    body = <C />;
  } else if (v && v.includes(".")) {
    body = <PhotoLayer src={v} />;
  } else {
    // Không có nền minh hoạ → dùng bố cục đơn giản (title/text/list/image) theo từng cảnh.
    body = rs.slice(seg.first, seg.last + 1).map((r) => (
      <Sequence key={r.from} from={r.from - seg.from} durationInFrames={r.to - r.from}>
        <SceneView scene={r} timeline={tl} speechFrom={r.speechFrom} />
      </Sequence>
    ));
  }
  const len = kind === "dip" ? XF * 2 : XF;
  const st = kind ? transitionStyle(kind, frame, len) : {};
  const grade = GRADES[seg.value.grade] ?? seg.value.grade;
  return (
    <SegContext.Provider value={{ dur: seg.to - seg.from }}>
      {kind === "dip" ? (
        <AbsoluteFill style={{ background: "#000", opacity: Math.min(1, (frame / len) * 2) }} />
      ) : null}
      <AbsoluteFill style={{ ...st, filter: [grade !== "none" ? grade : "", st.filter ?? ""].join(" ").trim() || undefined }}>
        {body}
      </AbsoluteFill>
      {kind === "leak" ? <LightLeak seed={`lk${seg.first}`} len={XF * 2} /> : null}
    </SegContext.Provider>
  );
};

const PanelSeg: React.FC<{ seg: Seg<Panel | null>; rs: Resolved[]; tl: Timeline }> = ({ seg, rs, tl }) => {
  const frame = useCurrentFrame() + seg.from;
  let cur = rs[seg.first];
  let reveal = 0;
  for (let i = seg.first; i <= seg.last; i++) {
    if (rs[i].from > frame) break;
    cur = rs[i];
    if (typeof rs[i].reveal === "number") reveal = Math.max(reveal, rs[i].reveal as number);
  }
  const fadeOut = interpolate(frame, [seg.to - 12, seg.to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <PanelView panel={seg.value as Panel} from={0} scene={cur} reveal={reveal} speakers={tl.speakers ?? {}} />
    </AbsoluteFill>
  );
};

/** Nhạc / tiếng nền: hoà trộn chéo MXF khung với đoạn sau, tự nhỏ lại khi có lời. */
const BedSeg: React.FC<{ seg: Seg<string | null>; speech: [number, number][]; fadeIn: boolean; fadeOut: boolean; loud: number; quiet: number }> = ({
  seg, speech, fadeIn, fadeOut, loud, quiet,
}) => {
  const len = seg.to - seg.from + (fadeOut ? MXF : 0);
  const volume = (f: number) => {
    const abs = f + seg.from;
    let lo = 0;
    let hi = speech.length - 1;
    let dist = Infinity;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const [a, b] = speech[mid];
      if (abs < a) { dist = Math.min(dist, a - abs); hi = mid - 1; } else if (abs > b) { dist = Math.min(dist, abs - b); lo = mid + 1; } else { dist = 0; break; }
    }
    const duck = quiet + (loud - quiet) * Math.min(1, dist / 24);
    const a = fadeIn ? Math.min(1, f / MXF) : Math.min(1, f / 12);
    const b = fadeOut ? Math.min(1, (len - f) / MXF) : Math.min(1, (len - f) / 20);
    return Math.max(0, duck * Math.min(a, b));
  };
  return <Audio src={audioSrc(seg.value as string)} loop volume={volume} />;
};

export const Stage: React.FC<{ timeline: Timeline }> = ({ timeline: tl }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const rs = useMemo(() => resolve(tl), [tl]);
  const bg = useMemo(
    () => segments<BgValue>(rs, (r) => ({ v: r.insertFile ? `@${r.insertFile}` : r.rVisual, grade: r.insertFile ? "none" : r.rGrade })),
    [rs],
  );
  const kinds = useMemo(() => bg.map((s, i) => pickTransition(rs, s, bg[i - 1], i)), [bg, rs]);
  const music = useMemo(() => segments(rs, (r) => r.rMusic).filter((s) => s.value), [rs]);
  const ambs = useMemo(() => segments(rs, (r) => r.rAmb).filter((s) => s.value), [rs]);
  const panels = useMemo(() => segments(rs, (r) => (r.insertFile ? null : r.rPanel)).filter((s) => s.value), [rs]);
  const speech = useMemo(
    () => rs.filter((r) => r.speechFrames > 0).map((r) => [r.from + r.speechFrom, r.from + r.speechFrom + r.speechFrames] as [number, number]),
    [rs],
  );
  const impacts = useMemo(() => rs.filter((r) => r.sfx && IMPACT.has(r.sfx)).map((r) => r.from + r.speechFrom), [rs]);
  const speakers = tl.speakers ?? {};
  const first = rs[0];
  const last = rs[rs.length - 1];
  const black = Math.max(
    first?.fadein ? interpolate(frame, [0, 1.5 * fps], [1, 0], { extrapolateRight: "clamp" }) : 0,
    last?.fadeout ? interpolate(frame, [last.from, last.to - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
  );

  // lấy nét: khi có chữ lớn / LED / bảng → nền mờ & tối đi (focus pull)
  const focusTarget = (f: number) => {
    const r = rs[sceneAt(rs, Math.max(0, f))];
    return !r.insertFile && (r.big || r.led || r.rPanel) ? 1 : 0;
  };
  let focus = 0;
  for (let k = 0; k < 16; k += 3) focus += focusTarget(frame - k);
  focus /= 6;
  // rung máy nhẹ khi có tiếng trống / chiêng
  let shake = 0;
  for (const at of impacts) {
    const d = frame - at;
    if (d >= 0 && d < 14) shake = Math.max(shake, Math.exp(-d / 4));
  }
  const sx = shake ? (rnd("shx", frame) - 0.5) * 14 * shake : 0;
  const sy = shake ? (rnd("shy", frame) - 0.5) * 10 * shake : 0;
  const cine = tl.cinematic !== false;

  return (
    <AbsoluteFill style={{ backgroundColor: tl.bg ?? "#05070d" }}>
      {/* nền */}
      <AbsoluteFill style={{
        filter: focus > 0.01 ? `blur(${(focus * 5).toFixed(2)}px) brightness(${(1 - focus * 0.25).toFixed(3)})` : undefined,
        transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${(1 + focus * 0.03 + shake * 0.01).toFixed(4)})`,
      }}>
        {bg.map((s, i) => (
          <Sequence key={`bg${i}`} from={s.from} durationInFrames={s.to - s.from + (i + 1 < bg.length ? (kinds[i + 1] === "dip" ? XF * 2 : XF) : 0)}>
            <Background seg={s} rs={rs} tl={tl} kind={i > 0 ? kinds[i] : null} />
          </Sequence>
        ))}
      </AbsoluteFill>
      {cine ? <LensVignette strength={0.32} /> : null}
      {/* bảng thông tin */}
      {panels.map((s, i) => (
        <Sequence key={`pn${i}`} from={s.from} durationInFrames={s.to - s.from}>
          <PanelSeg seg={s} rs={rs} tl={tl} />
        </Sequence>
      ))}
      {/* chữ theo từng cảnh */}
      {rs.map((r, i) => {
        const spk = r.speaker ? speakers[r.speaker] : undefined;
        const bigText = typeof r.big === "string" ? r.big : r.big ? r.text ?? "" : "";
        const quiet = r.rVisual === "blackout" || r.rVisual === "partcard" || !!r.insertFile;
        return (
          <Sequence key={`sc${i}`} from={r.from} durationInFrames={r.to - r.from}>
            {!quiet ? <PartChip part={r.rPart} section={r.rSection} fadeIn={i > 0 && (rs[i - 1].rPart !== r.rPart || !!rs[i - 1].insertFile || rs[i - 1].rVisual === "blackout")} /> : null}
            {r.led && !r.insertFile ? <LedText led={r.led} from={r.speechFrom + (r.section ? Math.round(3.2 * fps) : 0)} /> : null}
            {bigText ? <BigText text={bigText} from={r.speechFrom} frames={Math.max(r.speechFrames, 30)} color={spk?.color} /> : null}
            {r.section && !r.insertFile ? <SectionCard no={r.section.no} title={r.section.title} from={0} /> : null}
            {spk && r.speechFrames > 0 ? <SpeakerTag spk={spk} from={r.speechFrom} /> : null}
            {tl.captions !== false && r.text && r.speechFrames > 0 && r.big !== true ? (
              <Captions text={r.text} from={r.speechFrom} frames={r.speechFrames} color={spk?.color} />
            ) : null}
            {tl.showCues && r.cue ? <CueChip text={r.cue} /> : null}
            {r.sfx ? <Sequence from={r.speechFrom}><Audio src={audioSrc(r.sfx)} volume={0.8} /></Sequence> : null}
          </Sequence>
        );
      })}
      {/* tiếng vút nhẹ ở các lần chuyển chương */}
      {bg.map((s, i) => (i > 0 && (kinds[i] === "leak" || kinds[i] === "dip") && !rs[s.first].sfx ? (
        <Sequence key={`wh${i}`} from={Math.max(0, s.from - 10)} durationInFrames={60}>
          <Audio src={audioSrc("whoosh")} volume={0.35} />
        </Sequence>
      ) : null))}
      {/* âm thanh nền */}
      {music.map((s, i) => (
        <Sequence key={`mu${i}`} from={s.from} durationInFrames={s.to - s.from + MXF}>
          <BedSeg seg={s} speech={speech} fadeIn={i > 0 && music[i - 1].to === s.from} fadeOut={i + 1 < music.length && music[i + 1].from === s.to}
            loud={0.5} quiet={0.18} />
        </Sequence>
      ))}
      {ambs.map((s, i) => (
        <Sequence key={`am${i}`} from={s.from} durationInFrames={s.to - s.from + MXF}>
          <BedSeg seg={s} speech={speech} fadeIn={i > 0} fadeOut loud={0.42} quiet={0.26} />
        </Sequence>
      ))}
      {tl.audio ? <Audio src={staticFile(tl.audio)} /> : null}
      {cine ? <FilmGrain strength={0.06} /> : null}
      {typeof tl.letterbox === "number" ? <Letterbox ratio={tl.letterbox} /> : null}
      {black > 0 ? <AbsoluteFill style={{ background: "#000", opacity: black }} /> : null}
    </AbsoluteFill>
  );
};
