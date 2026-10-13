# Remotion template cho VideoLocalizer (làm tiếng trước, hình sau)

Template chạy hoàn toàn bằng **dữ liệu**: Claude chỉ cần viết file kịch bản JSON
(vài trăm token) chứ không phải viết/sửa code TSX cho mỗi video.

```
kịch bản.json ──VideoLocalizer──► voice.m4a + timeline.json + captions.srt ──► public/ ──Remotion──► video.mp4
```

## Cài một lần
```bat
cd remotion-template
npm install
```

## Mỗi video
1. Viết kịch bản (xem `kichban.mau.json`) — hoặc nhờ Claude viết theo prompt bên dưới.
2. Tạo giọng + timeline, chép thẳng vào `public/`:
   ```bat
   ..\.venv\Scripts\python ..\scripts\script_to_voice.py kichban.json --copy-to public
   ```
   (hoặc tab **🔊 Giọng nói → Kịch bản → Giọng + timeline** trong VideoLocalizer, ô "Chép vào public/")
3. Xem trước: `npm run studio` — render: `npm run render` → `out/video.mp4`.

Thời lượng video và từng cảnh lấy từ độ dài giọng đọc thật, nên hình luôn khớp tiếng.

## Video dài kiểu sân khấu (nền minh hoạ + nhạc + nhiều giọng)
Ví dụ đầy đủ: `kichban/hoi-thi-sach-2026.json` (~26 phút, FHD ngang) — xem `kichban/HUONG-DAN.md`.

Mọi hình nền, hiệu ứng, nhạc đều tự vẽ / tự tổng hợp trong code, không cần ảnh hay nhạc ngoài:
- `src/visuals/presets.tsx` — ~40 nền minh hoạ động (núi rừng, lễ hội, trường học, đêm mưa, ngọn đèn,
  cuốn sách 3D, cây Đăng Tâm, sân trường, lá cờ…). Đặt `"visual": "<tên>"` ở cảnh; nền giữ nguyên tới khi đổi.
- `src/overlays.tsx` — phụ đề, tên người nói, câu trích lớn, chữ LED, thẻ chương, bảng số liệu…
- `tools/make_audio.py` — tạo lại nhạc nền/hiệu ứng trong `public/audio/` (cần numpy, scipy).

Xem trước hình khi **chưa có mạng/giọng** (ước lượng thời lượng, không tạo tiếng):
```bat
..\.venv\Scripts\python ..\scripts\script_to_voice.py kichban\hoi-thi-sach-2026.json --dry-run --copy-to public
npm run studio
```

## Định dạng kịch bản
| Trường | Ý nghĩa |
|---|---|
| `voice`, `rate` | giọng Edge-TTS và tốc độ (`+0%`, `+15%`…) cho cả video; mỗi cảnh có thể ghi đè |
| `gap` | nghỉ giữa 2 cảnh (giây), mặc định 0.35 |
| `fps`, `width`, `height` | khổ video (mặc định 30fps, 1080×1920) |
| `accent`, `bg` | màu nhấn / màu nền |
| `captions` | `false` để tắt phụ đề chạy chữ |
| `scenes[].text` | **câu được đọc** (bỏ trống nếu là cảnh `hold`) |
| `scenes[].layout` | `title` · `text` · `list` · `image` |
| `scenes[].title` | chữ to trên màn hình |
| `scenes[].items` | danh sách gạch đầu dòng (layout `list`) |
| `scenes[].image` | tên ảnh trong `public/` hoặc URL (layout `image`) |
| `scenes[].pause` | nghỉ sau cảnh này (ghi đè `gap`) |
| `speakers` | `{ "vy": {"name","voice","rate","pitch","color"} }` — vai đọc; cảnh ghi `"speaker": "vy"` |
| `scenes[].hold` | cảnh không lời dài N giây (đoạn nhạc/múa/hoạt cảnh); có lời thì kéo dài tối thiểu N giây |
| `scenes[].visual` | nền minh hoạ (tên trong `src/visuals/presets.tsx`, hoặc tên ảnh trong `public/`) — giữ tới khi đổi |
| `scenes[].music` | nhạc nền: `forest` `rain` `piano` `tension` `warm` `festival` `bright`, file mp3 riêng trong `public/`, hoặc `none` — giữ tới khi đổi, tự nhỏ lại khi có lời |
| `scenes[].sfx` | hiệu ứng một lần: `drum` `drum3` `schooldrum` `chime` `gong` `whoosh` |
| `scenes[].panel` | bảng thông tin (`stats` `map` `merge` `decree` `card` `badge` `theme` `portrait` `trio` `titles` `rules5` `scale`); `null` để tắt |
| `scenes[].big` | `true` = hiện câu nói cỡ lớn giữa màn hình; hoặc ghi chữ khác |
| `scenes[].led` | chữ LED lớn `{title, sub, style}` |
| `scenes[].section` / `part` | thẻ chương `{no, title}` / tên phần (góc trên trái) |

Có thể dùng `.txt` (mỗi dòng 1 cảnh) hoặc `.srt` (bỏ qua mốc giờ) nếu chỉ cần chữ + giọng.

## Prompt mẫu cho Claude (tiết kiệm token)
> Viết kịch bản video TikTok 45 giây về **<chủ đề>** theo đúng định dạng JSON của
> `remotion-template/kichban.mau.json`. Chỉ trả về JSON. Mỗi cảnh 1 câu thoại ngắn
> (≤ 25 chữ), dùng layout `title` cho cảnh mở đầu, `list` khi liệt kê. Không sửa code.

Chỉ khi muốn thêm kiểu cảnh mới mới cần nhờ Claude sửa `src/Scene.tsx`.

## Ghi chú
- Ảnh/nhạc đặt trong `public/`. Muốn thêm nhạc nền, chèn `<Audio>` thứ hai trong `src/Video.tsx`
  hoặc render xong đưa video qua VideoLocalizer (ô Nhạc nền, `dub` tắt).
- Phụ đề trong template hiện dần theo ước lượng số ký tự. Muốn phụ đề cứng/karaoke chuẩn,
  tắt `captions` và đưa video + `captions.srt` vào VideoLocalizer (`sub_source = srt`,
  dịch `none`, tắt lồng tiếng, bật burn sub).
