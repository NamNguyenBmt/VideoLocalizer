// Khớp với timeline.json do VideoLocalizer xuất ra (core/script_voice.py).
export type Layout = "title" | "text" | "image" | "list";

export type Led = {
  title: string;
  sub?: string;
  style?: "drum" | "call" | "gold" | "part" | "quote" | "book" | "lyric" | "final";
};

export type Panel = { kind: string; [k: string]: unknown };

export type Scene = {
  text?: string; // câu thoại (được đọc + hiện phụ đề); bỏ trống = cảnh không lời
  start: number; // giây — VideoLocalizer tự điền
  end: number;
  duration: number;
  speech?: number; // độ dài lời đọc thật (giây)
  hold?: number; // cảnh không lời / tối thiểu bao nhiêu giây

  // ---- kiểu đơn giản (video dọc ngắn) ----
  layout?: Layout;
  title?: string;
  image?: string;
  items?: string[];
  bg?: string;
  accent?: string;

  // ---- kiểu sân khấu (dùng cho video dài) ----
  speaker?: string; // khóa trong timeline.speakers
  visual?: string | null; // nền minh hoạ (giữ nguyên tới khi đổi)
  music?: string | null; // nhạc nền: tên trong public/audio hoặc "none" (giữ tới khi đổi)
  panel?: Panel | null; // bảng thông tin (giữ tới khi đổi; null = tắt)
  sfx?: string; // hiệu ứng âm thanh một lần
  section?: { no?: string; title: string }; // thẻ chương mở đầu
  part?: string; // tên phần lớn (góc trên trái)
  big?: boolean | string; // hiện câu nói (hoặc chữ tùy chọn) cỡ lớn giữa màn hình
  led?: Led; // chữ LED lớn
  cue?: string; // ghi chú sân khấu (hiện khi showCues)
  reveal?: number; // số dòng đã hiện của bảng danh sách
  fadein?: boolean;
  fadeout?: boolean;
  [k: string]: unknown;
};

export type Speaker = { name: string; color?: string; voice?: string; rate?: string; pitch?: string };

export type Timeline = {
  title?: string;
  fps: number;
  width: number;
  height: number;
  duration: number;
  audio: string | null;
  bg?: string;
  accent?: string;
  captions?: boolean; // hiện phụ đề (mặc định true)
  showCues?: boolean;
  speakers?: Record<string, Speaker>;
  scenes: Scene[];
};
