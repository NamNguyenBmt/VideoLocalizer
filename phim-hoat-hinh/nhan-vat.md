# Bộ nhận diện nhân vật & phong cách — "Người thắp đèn cho núi" (phim hoạt hình ngắn)

> Bước 2 của quy trình. Mỗi nhân vật cần **một bộ ảnh mẫu** (nhiều góc) tạo bằng mô hình ảnh,
> sau đó **luôn đính kèm ảnh mẫu** khi tạo cảnh quay (bước 3) để nhân vật trông giống nhau.
> Prompt viết bằng tiếng Anh vì các mô hình tạo ảnh/video hiểu tiếng Anh tốt nhất;
> phần mô tả tiếng Việt để bạn duyệt.
>
> **Quy tắc vàng:** đoạn "MÔ TẢ CỐ ĐỊNH" của mỗi nhân vật phải được chép **nguyên văn** vào mọi prompt
> có nhân vật đó (storyboard.json đã chép sẵn). Không tự ý đổi màu áo, kiểu tóc giữa các cảnh.

## Phong cách chung

**Chọn: hoạt hình 2D vẽ tay, màu nước và bột màu** (kiểu phim Studio Ghibli và tranh minh hoạ sách thiếu nhi).

Lý do chọn:
- Hợp không khí núi rừng, đêm mưa, ánh đèn dầu.
- Hợp với chất "truyện trong sách" của Nhà xuất bản Kim Đồng.
- Với kiểu 2D, AI giữ nhân vật ổn định hơn kiểu 3D giống người thật, và ít bị biểu cảm gượng gạo.

Phương án khác là 3D hoạt hình kiểu Pixar: thay đoạn `STYLE` bên dưới, các phần khác giữ nguyên.

```
STYLE: hand-painted 2D animation, Studio Ghibli inspired, soft watercolor and gouache textures,
warm cinematic lighting, gentle film grain, Vietnamese northern highlands, misty mountains,
rice terraces, consistent character design, 16:9, no text, no watermark, no logo
```

```
NEGATIVE: photorealistic, 3D render, live action, text, subtitles, watermark, logo, extra fingers,
deformed hands, distorted face, inconsistent outfit, modern city clothes on villagers (except the mother),
blood, horror
```

**Bảng màu:**
- Ngày: xanh lá non, vàng lúa, xanh trời nhạt.
- Đêm: xanh lam đậm, ánh vàng cam của đèn dầu.
- Bình minh: hồng đào, cam nhạt.
- Màu chủ đạo của phim: **ánh vàng ấm của ngọn đèn**, xuất hiện ở mọi cảnh quan trọng.

---

## 1. Thầy Đạm — người thầy

| | |
|---|---|
| Tuổi | 24 lúc mới lên núi (cảnh 1–9) → khoảng 42 từ cảnh 10 đến lúc chia tay Hiếu (cảnh 16) |
| Tính cách | Hiền, ít nói, kiên nhẫn; ánh mắt ấm |
| Trang phục | Áo sơ mi trắng ngà cũ, tay xắn; quần vải nâu; dép quai hậu; ba lô vải xanh rêu (khi đi đường) |

**MÔ TẢ CỐ ĐỊNH (thầy trẻ):**
```
Teacher Dam: a slim young Vietnamese man, 24 years old, short neat black hair, kind gentle eyes,
light tan skin, faded off-white button shirt with rolled sleeves, brown cloth trousers,
simple sandals, olive-green canvas backpack
```
**MÔ TẢ CỐ ĐỊNH (thầy lớn tuổi, cảnh 10–16):** cùng người, thêm:
```
Teacher Dam, now in his early 40s: same face and kind eyes, a few grey strands at the temples,
slightly weathered skin, same faded off-white shirt with rolled sleeves and brown trousers
```

**Prompt ảnh mẫu (character sheet):**
```
Character reference sheet of [MÔ TẢ CỐ ĐỊNH thầy trẻ]. Front view, three-quarter view, side view,
back view, full body, plus 4 facial expressions (smile, worried, crying silently, determined).
Plain warm paper background. [STYLE]
```

## 2. Hiếu — cậu bé

| Giai đoạn | Mô tả cố định |
|---|---|
| Sơ sinh | `baby Hieu: a newborn baby wrapped in a faded indigo cloth with a small red embroidered border, sleeping in a woven bamboo basket` |
| 7 tuổi | `Hieu, 7 years old: a small Vietnamese boy, round face, big curious dark eyes, messy short black hair, oversized faded blue shirt, dark shorts, barefoot` |
| 17 tuổi | `Hieu, 17 years old: a tall thin Vietnamese teenage boy, same big dark eyes, short black hair, clean white school shirt, dark blue trousers, carries a thick medical book` |

**Điểm nhận diện xuyên suốt:** đôi mắt to đen tròn, và **mảnh vải chàm viền đỏ** (tấm vải quấn lúc sơ sinh).
Mảnh vải này về sau thành **chiếc túi đựng hạt giống**.

**Prompt ảnh mẫu:** tạo **3 bảng riêng**, mỗi giai đoạn một bảng, theo mẫu giống thầy Đạm.

## 3. Mẹ của Hiếu

| | |
|---|---|
| Cảnh xuất hiện | Chỉ lúc trở về (cảnh 10), khoảng 35 tuổi |
| Trang phục | Áo khoác dạ màu be kiểu thành phố, khăn quàng mỏng; tóc dài buộc thấp |

**MÔ TẢ CỐ ĐỊNH:**
```
Hieu's mother: a Vietnamese woman about 35, long black hair tied low, sad gentle eyes,
beige city coat, thin pale scarf, holding a small handbag
```

## 4. Bối cảnh & đạo cụ (cũng cần ảnh mẫu)

| Tên | Mô tả cố định |
|---|---|
| Ngôi trường | `the mountain school: a small wooden classroom on stilts with a dark tin roof, one red flag on a bamboo pole, a narrow wooden veranda, surrounded by misty pine forest and rice terraces` |
| Đèn dầu | `the oil lamp: a small brass kerosene lamp with a clear glass chimney, warm golden flame` |
| Cây Đăng Tâm | `the Dang Tam tree: a slender mountain tree with silver-grey bark, heart-shaped leaves, later small glowing golden fruits` |
| Túi hạt giống | `the seed pouch: a small pouch sewn from faded indigo cloth with a red embroidered border, tied with a string` |

## Bước 2 — cách làm khi có API key

1. Tạo 5 bảng nhân vật: thầy trẻ, thầy lớn tuổi, Hiếu 7 tuổi, Hiếu 17 tuổi, mẹ. Tạo thêm 4 ảnh bối cảnh và đạo cụ.
2. **Chọn tay** bản đẹp nhất, lưu vào `phim-hoat-hinh/mau/` đúng tên file ghi trong `storyboard.json`
   (vd. `mau/thay-tre.png`).
3. Từ đó trở đi, mọi cảnh quay đều đính kèm các ảnh mẫu này.
