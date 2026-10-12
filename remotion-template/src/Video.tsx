import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SceneView } from "./Scene";
import { Caption } from "./Caption";
import type { Timeline } from "./types";

export const Video: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const { fps, scenes } = timeline;
  const total = Math.ceil(timeline.duration * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: timeline.bg ?? "#0f1115" }}>
      {timeline.audio ? <Audio src={staticFile(timeline.audio)} /> : null}
      {scenes.map((s, i) => {
        // Cảnh hiện từ lúc bắt đầu đọc tới khi cảnh sau bắt đầu (cảnh đầu hiện từ 0).
        const from = i === 0 ? 0 : Math.round(s.start * fps);
        const to = i + 1 < scenes.length ? Math.round(scenes[i + 1].start * fps) : total;
        const speechFrom = Math.round(s.start * fps) - from;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}>
            <SceneView scene={s} timeline={timeline} speechFrom={speechFrom} />
            {timeline.captions !== false ? (
              <Caption text={s.text} from={speechFrom} frames={Math.round(s.duration * fps)} />
            ) : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
