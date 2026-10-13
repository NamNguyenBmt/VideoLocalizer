import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneView } from "./Scene";
import { BigText, Captions, CueChip, LedText, PanelView, PartChip, SectionCard, SpeakerTag } from "./overlays";
import type { Panel, Scene, Timeline } from "./types";
import { PhotoLayer } from "./visuals/Book";
import { VISUALS } from "./visuals/presets";
import { SegContext } from "./visuals/seg";

const XF = 18; // khung hình hòa trộn giữa 2 nền

type Resolved = Scene & {
  from: number; to: number; speechFrom: number; speechFrames: number;
  rVisual: string | null; rMusic: string | null; rPanel: Panel | null; rPart?: string;
  rSection?: { no?: string; title: string };
};

type Seg<T> = { value: T; from: number; to: number; first: number; last: number };

/** "visual", "music", "panel", "part" carry forward until a scene changes them. */
function resolve(tl: Timeline): Resolved[] {
  const { fps, scenes } = tl;
  const total = Math.ceil(tl.duration * fps);
  let visual: string | null = null;
  let music: string | null = null;
  let panel: Panel | null = null;
  let part: string | undefined;
  let section: { no?: string; title: string } | undefined;
  return scenes.map((s, i) => {
    if ("visual" in s) visual = s.visual ?? null;
    if ("music" in s) music = s.music && s.music !== "none" ? s.music : null;
    if ("panel" in s) panel = s.panel ?? null;
    if (s.part) { part = s.part; section = undefined; }
    if (s.section) section = s.section;
    const from = i === 0 ? 0 : Math.round(s.start * fps);
    const to = i + 1 < scenes.length ? Math.round(scenes[i + 1].start * fps) : total;
    const speechFrom = Math.round(s.start * fps) - from;
    const speech = s.speech ?? (s.text ? s.duration : 0);
    return {
      ...s, from, to: Math.max(from + 1, to), speechFrom, speechFrames: Math.round(speech * fps),
      rVisual: visual, rMusic: music, rPanel: panel, rPart: part, rSection: section,
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

const audioSrc = (name: string) => staticFile(name.includes(".") ? name : `audio/${name}.mp3`);

const Background: React.FC<{ seg: Seg<string | null>; rs: Resolved[]; tl: Timeline; xfIn: boolean }> = ({ seg, rs, tl, xfIn }) => {
  const frame = useCurrentFrame();
  const o = xfIn ? interpolate(frame, [0, XF], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const v = seg.value;
  let body: React.ReactNode;
  if (v && VISUALS[v]) {
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
  return (
    <SegContext.Provider value={{ dur: seg.to - seg.from }}>
      <AbsoluteFill style={{ opacity: o }}>{body}</AbsoluteFill>
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

const MusicSeg: React.FC<{ seg: Seg<string | null>; speech: [number, number][] }> = ({ seg, speech }) => {
  const len = seg.to - seg.from;
  const volume = (f: number) => {
    const abs = f + seg.from;
    // khoảng cách tới đoạn có lời gần nhất (tìm nhị phân)
    let lo = 0;
    let hi = speech.length - 1;
    let dist = Infinity;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const [a, b] = speech[mid];
      if (abs < a) { dist = Math.min(dist, a - abs); hi = mid - 1; } else if (abs > b) { dist = Math.min(dist, abs - b); lo = mid + 1; } else { dist = 0; break; }
    }
    const duck = 0.2 + 0.32 * Math.min(1, dist / 20);
    const edge = Math.min(1, f / 25, (len - f) / 25);
    return Math.max(0, duck * edge);
  };
  return <Audio src={audioSrc(seg.value as string)} loop volume={volume} />;
};

export const Stage: React.FC<{ timeline: Timeline }> = ({ timeline: tl }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const rs = useMemo(() => resolve(tl), [tl]);
  const bg = useMemo(() => segments(rs, (r) => r.rVisual), [rs]);
  const music = useMemo(() => segments(rs, (r) => r.rMusic).filter((s) => s.value), [rs]);
  const panels = useMemo(() => segments(rs, (r) => r.rPanel).filter((s) => s.value), [rs]);
  const speech = useMemo(
    () => rs.filter((r) => r.speechFrames > 0).map((r) => [r.from + r.speechFrom, r.from + r.speechFrom + r.speechFrames] as [number, number]),
    [rs],
  );
  const speakers = tl.speakers ?? {};
  const first = rs[0];
  const last = rs[rs.length - 1];
  const black = Math.max(
    first?.fadein ? interpolate(frame, [0, 1.5 * fps], [1, 0], { extrapolateRight: "clamp" }) : 0,
    last?.fadeout ? interpolate(frame, [last.from, last.to - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: tl.bg ?? "#05070d" }}>
      {/* nền */}
      {bg.map((s, i) => (
        <Sequence key={`bg${i}`} from={s.from} durationInFrames={s.to - s.from + (i + 1 < bg.length ? XF : 0)}>
          <Background seg={s} rs={rs} tl={tl} xfIn={i > 0} />
        </Sequence>
      ))}
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
        const quiet = r.rVisual === "blackout" || r.rVisual === "partcard";
        return (
          <Sequence key={`sc${i}`} from={r.from} durationInFrames={r.to - r.from}>
            {!quiet ? <PartChip part={r.rPart} section={r.rSection} /> : null}
            {r.led ? <LedText led={r.led} from={r.speechFrom + (r.section ? Math.round(3.2 * fps) : 0)} /> : null}
            {bigText ? <BigText text={bigText} from={r.speechFrom} frames={Math.max(r.speechFrames, 30)} color={spk?.color} /> : null}
            {r.section ? <SectionCard no={r.section.no} title={r.section.title} from={0} /> : null}
            {spk && r.speechFrames > 0 ? <SpeakerTag spk={spk} from={r.speechFrom} /> : null}
            {tl.captions !== false && r.text && r.speechFrames > 0 && r.big !== true ? (
              <Captions text={r.text} from={r.speechFrom} frames={r.speechFrames} color={spk?.color} />
            ) : null}
            {tl.showCues && r.cue ? <CueChip text={r.cue} /> : null}
            {r.sfx ? <Sequence from={r.speechFrom}><Audio src={audioSrc(r.sfx)} volume={0.8} /></Sequence> : null}
          </Sequence>
        );
      })}
      {/* âm thanh */}
      {music.map((s, i) => (
        <Sequence key={`mu${i}`} from={s.from} durationInFrames={s.to - s.from}>
          <MusicSeg seg={s} speech={speech} />
        </Sequence>
      ))}
      {tl.audio ? <Audio src={staticFile(tl.audio)} /> : null}
      {black > 0 ? <AbsoluteFill style={{ background: "#000", opacity: black }} /> : null}
    </AbsoluteFill>
  );
};
