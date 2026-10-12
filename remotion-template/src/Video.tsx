import { Stage } from "./Stage";
import type { Timeline } from "./types";

// Mọi kịch bản đi qua Stage: cảnh có "visual" dùng nền minh hoạ + nhạc + bảng,
// cảnh không có thì dùng bố cục đơn giản (layout title/text/list/image) như trước.
export const Video: React.FC<{ timeline: Timeline }> = ({ timeline }) => <Stage timeline={timeline} />;
