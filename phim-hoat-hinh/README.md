# Phim hoạt hình ngắn — "Người thắp đèn cho núi" (bản chuẩn bị)

Phim hoạt hình 2D vẽ tay, khoảng **2 phút 25 giây**, gồm 17 cảnh quay AI và 1 thẻ kết.
Phim phỏng theo phần kể chuyện trong kịch bản giới thiệu sách của đội THCS Hòa Phú,
dựa trên truyện của nhà văn Lê Quang Trạng (NXB Kim Đồng).

## 6 bước — đang ở đâu

| # | Bước | Công cụ | Trạng thái |
|---|---|---|---|
| 1 | Kịch bản, chia cảnh, prompt từng cảnh | Claude | ✅ `storyboard.json` |
| 2 | Thiết kế nhân vật, bộ ảnh mẫu | Gemini (tạo ảnh) | 📝 Đã có mô tả và prompt: `nhan-vat.md`. **Chờ API key** |
| 3 | Tạo cảnh quay hoạt hình | Gemini Omni Flash | 📝 Đã có prompt cho 17 cảnh. **Chờ API key** |
| 4 | Giọng kể và lời thoại | VideoLocalizer (Edge-TTS) | ✅ Chạy được ngay với `storyboard.json` |
| 5 | Dựng tổng: phụ đề, nhạc, tiếng nền, chuyển cảnh | Remotion | ⚙️ Cần thêm phần phát clip video làm nền (việc nhỏ, làm khi có clip) |
| 6 | Thẻ tên phim, danh đề | HyperFrames | ✅ Mẫu đã có ở nhánh nháp |

## Các file

- `nhan-vat.md`: phong cách, bảng màu, mô tả cố định và prompt ảnh mẫu cho từng nhân vật, bối cảnh, đạo cụ.
- `storyboard.json`: kịch bản đúng định dạng VideoLocalizer. Mỗi cảnh có:
  - `text` / `speaker`: lời kể hoặc lời thoại (bước 4 tạo giọng từ đây).
  - `hold`: độ dài cảnh (giây).
  - `mo_ta`: mô tả tiếng Việt để bạn duyệt.
  - `gen.prompt`, `gen.negative`, `gen.refs`: prompt tiếng Anh và ảnh mẫu cần đính kèm khi tạo cảnh quay (bước 3).
  - `gen.out`: tên file clip sẽ lưu (`canh/canh-01.mp4`…).
- `mau/`: chỗ để ảnh mẫu nhân vật sau bước 2 (chưa có).

## Bảng cảnh (để duyệt)

| Cảnh | Bắt đầu | Dài | Hình | Lời |
|---|---|---|---|---|
| 1 | 0:00 | 8s | Bình minh, núi rừng mênh mông, con đường đèo, một bóng người nhỏ đeo ba lô đi lên. | Kể: Có những nơi, con đường đến trường phải vượt qua cả núi, cả suối. |
| 2 | 0:08 | 8s | Thầy giáo trẻ dừng trên sườn núi, lau mồ hôi, nhìn về phía trước. | Kể: Sau khi tốt nghiệp, thầy Đạm lên một vùng núi xa xôi. Thầy nghĩ, rồi sẽ có ngày mình trở về. |
| 3 | 0:16 | 8s | Lũ trẻ chạy ùa ra từ ngôi trường nhỏ đón thầy; thầy quỳ xuống cười với các em. | Kể: Nhưng núi rừng, mái trường nhỏ và những đứa trẻ nơi đây đã giữ chân thầy lại. |
| 4 | 0:24 | 7s | Đêm mưa. Thầy soạn bài bên đèn dầu, chợt ngẩng lên lắng nghe. | Kể: Rồi một đêm mưa... có tiếng trẻ thơ khóc vang lên nơi hành lang. |
| 5 | 0:31 | 8s | Ngoài hiên mưa, thầy cầm đèn, thấy chiếc giỏ tre có em bé và lá thư. | Kể: Trong chiếc giỏ nhỏ là một em bé, cùng một lá thư. |
| 6 | 0:39 | 8s | Thầy bế em bé áp vào ngực che gió lạnh; bé nín khóc. | Kể: Thầy ôm đứa trẻ vào lòng. Và thầy đặt tên em là Hiếu. |
| 7 | 0:47 | 8s | Mùa nối mùa; thầy nấu cơm bên bếp lửa, em bé chập chững bước tới. | Kể: Thầy ở lại núi không phải một năm, hai năm... mà là hơn mười năm. |
| 8 | 0:55 | 8s | Mưa lớn, thầy cõng Hiếu trên lưng, che tấm nilon cho cả hai, đi đến trường. | Kể: Những ngày mưa, thầy cõng em trên lưng, lấy tấm nilon che cho cả hai thầy trò. |
| 9 | 1:03 | 8s | Bên bếp lửa tối, Hiếu ngước nhìn thầy hỏi; thầy mỉm cười xoa đầu em. | Kể: Có lần Hiếu hỏi: mẹ con là ai? Thầy chỉ cười: thầy sinh ra con vào một bữa mưa đêm. |
| 10 | 1:11 | 8s | Thầy trồng cây Đăng Tâm; cây lớn dần qua năm tháng. | Kể: Thầy tìm và trồng cây Đăng Tâm, loài cây quý của núi rừng, như trồng một niềm tin. |
| 11 | 1:19 | 7s | Hiếu 17 tuổi đọc sách y khoa bên đèn; thầy đứng ở cửa nhìn, tự hào. | Kể: Hiếu lớn lên, học giỏi, ước mơ trở thành bác sĩ để chữa bệnh cho người dân nơi núi rừng. |
| 12 | 1:26 | 8s | Người phụ nữ mặc áo khoác thành phố bước vào sân trường; Hiếu bối rối lùi lại. | Kể: Mười tám năm sau, mẹ của Hiếu trở về. Nhưng với Hiếu, đó là lần đầu tiên em nhìn thấy mẹ. |
| 13 | 1:34 | 7s | Đêm, thầy ngồi một mình bên đèn dầu, không ngủ. | Kể: Đêm ấy, người thầy không ngủ. |
| 14 | 1:41 | 8s | Sáng hôm sau, thầy đặt tay lên vai Hiếu khuyên nhủ; Hiếu lắc đầu, rưng rưng. | Thầy: Ai cũng phải có cha có mẹ. Công ơn sinh thành không có gì sánh bằng đâu con. |
| 15 | 1:49 | 8s | Bình minh dưới chân núi; dân bản, học trò đứng hai bên; thầy trao Hiếu túi hạt giống. | Kể: Ngày Hiếu rời núi, thầy không níu kéo. Thầy chỉ trao cho em một túi hạt giống Đăng Tâm. |
| 16 | 1:57 | 8s | Hiếu ôm thầy rồi theo mẹ xuống núi, ngoái lại lần cuối; thầy đứng vẫy tay. | Thầy: Cây Đăng Tâm đã ra trái rồi đó con. |
| 17 | 2:05 | 12s | Đêm buông, một ngọn đèn ấm vẫn sáng giữa núi rừng, đom đóm bay lên. | Kể: Hiếu xuống núi để đi tiếp con đường của mình. Còn người thầy vẫn ở lại, với núi, với học trò, và với ngọn đèn đã thắp suốt cả tuổi trẻ. |
| — | 2:17 | 7s | Thẻ kết: ngọn đèn và cuốn sách | *“Có những người không chỉ thắp đèn cho núi — mà còn thắp sáng cả những cuộc đời!”* |

## Nguyên tắc để phim trông như một bộ phim

- **Giữ nhân vật đồng nhất:** mọi prompt đều chép nguyên văn mô tả cố định của nhân vật và đính kèm ảnh mẫu. Không sửa mô tả lẻ ở từng cảnh.
- **Tránh khớp khẩu hình:** gần như toàn bộ là lời người kể nói ngoài khung hình. Hai câu của thầy được đặt ở cảnh quay nghiêng, từ phía sau hoặc từ xa, nên không cần môi khớp lời.
- **Ánh đèn là sợi chỉ xuyên suốt:** ngọn đèn dầu xuất hiện ở các cảnh 4, 5, 11, 13 và 17.
- **Nhịp phim:** cảnh 7–8 giây; các cảnh cảm xúc (6, 14, 16) có lệnh máy quay đẩy vào chậm; cảnh cuối kéo lùi trên cao.
- **Tạo mỗi cảnh 2–4 lần** rồi chọn bản đẹp nhất. Đây là việc bình thường khi làm phim bằng AI.

## Khi có API key Gemini — việc còn lại

1. Bước 2: tạo ảnh mẫu theo `nhan-vat.md`, chọn bản đẹp, lưu vào `mau/`.
2. Bước 3: viết script `scripts/gen_scenes.py`. Script đọc `storyboard.json`, gọi Gemini API theo `gen` của từng cảnh, lưu vào `canh/` và bỏ qua cảnh đã có.
3. Bước 4: `python scripts/script_to_voice.py phim-hoat-hinh/storyboard.json --copy-to remotion-template/public`
4. Bước 5: chép `canh/*.mp4` vào `remotion-template/public/phim/`, thêm phần phát clip video làm nền vào Remotion, rồi render.

Chưa rõ chi phí API cho mỗi giây video; cần xem bảng giá của Google trước khi chạy hàng loạt.
