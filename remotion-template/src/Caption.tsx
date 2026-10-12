import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

// Phụ đề hiện dần từng chữ theo độ dài câu đọc (ước lượng đều theo số ký tự).
export const Caption: React.FC<{ text: string; from: number; frames: number }> = ({
  text, from, frames,
}) => {
  const frame = useCurrentFrame() - from;
  const words = text.split(/\s+/).filter(Boolean);
  const totalChars = words.reduce((n, w) => n + w.length + 1, 0);
  let acc = 0;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: "12%" }}>
      <div style={{
        maxWidth: "86%", textAlign: "center", fontFamily: "Inter, Arial, sans-serif",
        fontSize: 54, fontWeight: 700, lineHeight: 1.3, color: "white",
        textShadow: "0 3px 12px rgba(0,0,0,.8)",
      }}>
        {words.map((w, i) => {
          const at = (acc / totalChars) * frames;
          acc += w.length + 1;
          const o = interpolate(frame, [at - 3, at], [0.35, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return <span key={i} style={{ opacity: o }}>{w} </span>;
        })}
      </div>
    </AbsoluteFill>
  );
};
