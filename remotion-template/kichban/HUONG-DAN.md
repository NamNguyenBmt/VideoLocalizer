# Video Hội thi Thiếu nhi tuyên truyền giới thiệu sách 2026 — THCS Hòa Phú

`hoi-thi-sach-2026.json` gộp 3 kịch bản thành một video **FHD ngang 1920×1080, khoảng 26 phút**:

| Phần | Nội dung | Thời lượng (ước tính) |
|---|---|---|
| 1. Sắc màu Hòa Phú | Hội về bản → Tây Bắc đến Hòa Phú → số liệu xã → mái trường → sách → hội thi, giới thiệu 3 thí sinh → 13 bạn trở lại → kết | ~6 phút |
| 2. Giới thiệu sách | "Người thắp đèn cho núi": video mở đầu, mục I–XII, các hoạt cảnh | ~16 phút |
| 3. Năng khiếu | "Bước chân tới trường — Hành trình ước mơ": bình minh vùng cao, sân trường, 5 điều Bác Hồ dạy, ánh sáng tri thức, lá cờ | ~5 phút |
| Lời kết (XIII) | Ba bạn khép lại phần thi, LED cuối | ~1 phút |

Giọng đọc (Edge-TTS): **Tường Vy** = Hoài My, **My Anh** = Hoài My giọng cao và nhanh hơn một chút,
**Đức Huy** = Nam Minh. Ngoài ra có tiếng gọi, cả lớp, thầy giáo, cả đội (xem `speakers`).

## Chạy trên máy (Windows)

Cách nhanh: bấm đúp `remotion-template\lam-video.bat`. File này tự cài, tạo giọng, render các đoạn chèn HyperFrames (mở đầu, thẻ chương, danh đề), render Remotion rồi master âm thanh → `out\video-master.mp4`.

Các đoạn HyperFrames cần **Node.js 22 trở lên**. Máy có Node cũ hơn thì các đoạn này tự được thay bằng nền Remotion, video vẫn ra bình thường.
Hoặc chạy từng bước:

```bat
cd VideoLocalizer\remotion-template
npm install                                   :: một lần

:: 1) tạo giọng + timeline (cần mạng, ~5–10 phút cho 238 câu; lỗi mạng thì chạy lại, câu đã tạo được giữ)
..\.venv\Scripts\python ..\scripts\script_to_voice.py kichban\hoi-thi-sach-2026.json --copy-to public

:: 2) xem trước
npm run studio

:: 3) render FHD
npm run render                                :: → out\video.mp4
```

Muốn xem hình trước khi tạo giọng: thêm `--dry-run` ở bước 1 (thời lượng ước tính, không có tiếng đọc).

## Sửa nhanh

- **Sửa lời**: sửa `text` của cảnh, rồi chạy lại bước 1. Chỉ những câu đã đổi mới được tạo giọng lại.
- **Đổi giọng hoặc tốc độ một bạn**: sửa `speakers.vy.voice`, `speakers.vy.rate` (vd. `"+5%"`), `speakers.vy.pitch` (vd. `"+10Hz"`).
- **Ảnh thật của 3 bạn**: chép ảnh vào `public/` (vd. `public/vy.jpg`), rồi thêm `"photo": "vy.jpg"`
  vào `panel` có `"kind": "portrait"` tương ứng.
- **Bìa sách thật**: chép vào `public/bia-sach.jpg`. Trong `src/visuals/presets.tsx`, ở `BookScene`/`LampBook`,
  thêm `cover="bia-sach.jpg"` vào `<Book3D …>`.
- **Video/ảnh thật của Hòa Phú**: dùng tên ảnh làm `visual`, vd. `"visual": "hoaphu-1.jpg"`. Ảnh sẽ tự zoom chậm.
- **Bài hát thật "Bước chân tới trường"**: chép mp3 vào `public/` rồi đặt `"music": "buoc-chan-toi-truong.mp3"`
  ở cảnh `hold` 70 giây của mục "2. Con đường đến trường". Chỉnh `hold` cho bằng độ dài bài.
- **Hiện ghi chú sân khấu** (hoạt cảnh, đạo cụ) ở góc phải để tập dượt: đặt `"showCues": true`.
- **Nâng lên 2K**: đặt `"width": 2560, "height": 1440`. Chữ và bảng tự co giãn theo khổ, không cần sửa code.

## Lưu ý về nội dung
- Câu "Về tôn giáo, toàn xã có 08 trường học công lập…" trong kịch bản gốc đã được đổi thành **"Về giáo dục, …"**
  (câu này nói về trường học). Nếu không đúng ý thì sửa lại trong JSON.
- Lời tiếng Thái "Mọi người ơi, đi chơi hội thôi!" đang được đọc bằng tiếng Việt, trên màn hình có ghi chú "tiếng Thái".
  Khi có bản ghi âm thật, đặt `"sfx": "<file>.mp3"` cho cảnh đó và xóa `text`.
- Lời thầy giáo ("Thầy chào cả lớp…") và lời chào kết của tiết mục năng khiếu là lời **viết tạm**,
  vì kịch bản gốc chưa có. Lời chào kết lấy từ thông điệp của tiết mục.
- Nhạc nền và hiệu ứng âm thanh do `tools/make_audio.py` tự tổng hợp, không dùng nhạc có bản quyền.
