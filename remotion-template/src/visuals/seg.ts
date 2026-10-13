import { createContext, useContext } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/** Frame / length of the current background segment (one visual, many scenes). */
export const SegContext = createContext<{ dur: number }>({ dur: 300 });

export function useSeg() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { dur } = useContext(SegContext);
  return { f, fps, dur, p: Math.max(0, Math.min(1, f / Math.max(1, dur))), t: f / fps };
}
