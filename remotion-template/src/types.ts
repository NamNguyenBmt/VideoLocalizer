// Khớp với timeline.json do VideoLocalizer xuất ra (core/script_voice.py).
export type Layout = "title" | "text" | "image" | "list";

export type Scene = {
  text: string; // câu thoại (được đọc + hiện phụ đề)
  start: number; // giây — VideoLocalizer tự điền
  end: number;
  duration: number;
  layout?: Layout; // mặc định "text"
  title?: string; // chữ to trên màn hình
  image?: string; // tên file trong public/ hoặc URL
  items?: string[]; // cho layout "list"
  bg?: string; // màu nền cảnh
  accent?: string; // màu nhấn
};

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
  scenes: Scene[];
};
