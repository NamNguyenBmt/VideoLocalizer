import { Composition, staticFile } from "remotion";
import { Video } from "./Video";
import type { Timeline } from "./types";
import { loadFonts } from "./fonts";

loadFonts();

const FALLBACK: Timeline = {
  fps: 30, width: 1080, height: 1920, duration: 3, audio: null,
  scenes: [{ text: "Chưa có public/timeline.json", start: 0, end: 3, duration: 3 }],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Main"
    component={Video}
    defaultProps={{ timeline: FALLBACK }}
    // Độ dài/khổ video lấy từ timeline.json → hình luôn khớp giọng đọc.
    calculateMetadata={async () => {
      const res = await fetch(staticFile("timeline.json"));
      const timeline: Timeline = res.ok ? await res.json() : FALLBACK;
      return {
        props: { timeline },
        fps: timeline.fps,
        width: timeline.width,
        height: timeline.height,
        durationInFrames: Math.max(1, Math.ceil(timeline.duration * timeline.fps)),
      };
    }}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={90}
  />
);
