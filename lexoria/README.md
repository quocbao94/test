# Lexoria — Game nhập vai luyện thi IELTS/TOEIC

Vương quốc Lexoria bị **Lời nguyền Câm lặng**: con chữ biến thành quái vật. Bạn là một Wordsmith tập sự,
săn quái từ vựng, thuyết phục NPC bằng tiếng Anh và rèn vũ khí từ bài viết IELTS để phá lời nguyền.

Web app (PWA): chơi được trên trình duyệt máy tính và điện thoại, cài được lên màn hình chính.

## Đã có trong bản MVP

| Tính năng | Mô tả |
|---|---|
| Tạo nhân vật | Tên, class (Scholar / Bard / Ranger / Sage — mỗi class có bonus riêng), kỳ thi IELTS/TOEIC, mục tiêu, ngày thi (đếm ngược trên HUD) |
| Thị trấn Khởi đầu | Bản đồ pixel art, 3 NPC, Lò rèn, cổng rừng có lính gác |
| Rừng Từ Vựng | 90 từ IELTS (Môi trường, Công nghệ, Giáo dục), quái đi lang thang, boss **Vua Câm Lặng** (mở khi đạt cấp 3) |
| Chiến đấu theo lượt | 3 dạng câu hỏi (nghĩa, điền từ, collocation), đếm giờ 15s, trả lời < 4s = chí mạng, combo, xem lại từ + phát âm sau mỗi câu |
| Spaced repetition (FSRS) | Mỗi câu trả lời cập nhật lịch ôn của từ; từ sắp quên làm quái hiện dấu ❗ và được ưu tiên trong trận |
| Sổ từ (Bestiary) | Mỗi từ là một "quái" đã thu phục: 🥚 → 🐣 → 🐉 → 👑 theo mức độ nhớ |
| NPC trò chuyện bằng AI | Claude đóng vai NPC (stream từng chữ), nhiệm vụ hội thoại "thuyết phục lính gác", bảng nhận xét: sửa lỗi, cách nói tự nhiên hơn, từ vựng band cao |
| Lò rèn Văn chương | Viết IELTS Writing Task 2 → Claude chấm 4 tiêu chí + band tổng → rèn vũ khí (band càng cao càng hiếm/mạnh) |
| Tiến trình | XP, cấp độ, nhiệm vụ hằng ngày, chuỗi ngày học (lửa trại), nhật ký lỗi |
| Lưu game | Luôn lưu trong trình duyệt; đăng nhập Supabase để đồng bộ đám mây |
| Giọng nói | Phát âm từ/câu bằng Text-to-Speech, nói vào micro để trò chuyện với NPC (Chrome/Edge/Safari) |

**Chế độ offline:** không cấu hình Supabase vẫn chơi được toàn bộ phần săn quái/ôn từ. NPC dùng lời thoại
soạn sẵn, nhiệm vụ lính gác được chấm bằng luật đơn giản; Lò rèn cần máy chủ để chấm bài.

## Điều khiển

- Di chuyển: phím mũi tên / WASD, hoặc giữ ngón tay/chuột trên bản đồ để đi về phía đó
- Tương tác: `E` / `Space` hoặc nút **OK**
- Trong trận: phím `1`–`4` để trả lời, `Enter` để tiếp tục
- `B` Sổ từ · `Q` Nhiệm vụ · `C` Nhân vật · `Esc` đóng cửa sổ

## Chạy thử

```bash
cd lexoria
npm install
npm run dev          # http://localhost:5173 — chạy offline nếu chưa có .env
```

Kiểm tra:

```bash
npm run typecheck && npm run lint && npm test   # 37 unit test
npm run e2e                                     # Playwright: tạo nhân vật → nói chuyện → vào rừng → thắng trận
npm run build                                   # bản production + service worker PWA
```

Ảnh chụp từ e2e nằm ở `e2e/screenshots/`.

## Supabase dev (`lexoria-dev`)

Repo đã kèm `.env.development` trỏ tới project `lexoria-dev` (ref `iamekgumxtxsuadgxfeg`, Singapore): đã chạy
migration, bật đăng nhập Email, Redirect URLs gồm `http://localhost:5173` và `http://localhost:4173`. Vì vậy
`npm run dev` có sẵn đăng nhập + đồng bộ đám mây; `npm run e2e` vẫn chạy offline (`--mode e2e`). Edge Functions
`npc-chat` và `grade-writing` đã deploy nhưng **chưa đặt `ANTHROPIC_API_KEY`**: khi đó function trả 503
`ai_disabled` (không trừ hạn mức), NPC tự chuyển sang lời thoại offline, Lò rèn báo "AI chưa được bật". Đặt khóa
bằng `supabase secrets set ANTHROPIC_API_KEY=...` là AI chạy, không cần deploy lại.

Kiểm tra với project thật (cần service role key, lấy ở Supabase → Project Settings → API Keys; không commit):

```bash
SUPABASE_SERVICE_ROLE_KEY=... npm run test:cloud   # đăng nhập email, đẩy/kéo save, RLS, Edge Functions
SUPABASE_SERVICE_ROLE_KEY=... npm run e2e:cloud    # trình duyệt: magic link → đồng bộ → máy thứ 2 tải save → NPC
```

Hai test tự tạo và tự xoá user `lexoria-*@example.com`.

## Kết nối Supabase + Claude (để bật AI và lưu đám mây)

1. Tạo project Supabase, rồi trong thư mục `lexoria/`:
   ```bash
   supabase link --project-ref <project-ref>
   supabase db push                                   # tạo bảng + RLS từ supabase/migrations
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  # khóa API Claude, chỉ nằm trên máy chủ
   supabase functions deploy npc-chat
   supabase functions deploy grade-writing
   ```
   Tuỳ chọn: `AI_DAILY_LIMIT` (mặc định 40 lượt AI/người/ngày), `CLAUDE_MODEL` (mặc định `claude-sonnet-5-5`).
2. Bật đăng nhập Email (magic link) và/hoặc Google trong Supabase → Authentication, thêm URL của game vào
   Redirect URLs.
3. Tạo `lexoria/.env` từ `.env.example` với `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.

Khóa Claude không bao giờ xuống trình duyệt: client gọi Edge Function bằng JWT của người chơi, function kiểm
tra đăng nhập, trừ hạn mức trong bảng `ai_usage`, rồi mới gọi Claude. Persona của NPC và đề bài nằm phía máy
chủ (`supabase/functions/_shared/content.ts`) nên người chơi không sửa được prompt.

## Cấu trúc

```
lexoria/
  src/
    content/        # từ vựng (JSON), đề Writing, NPC
    game/           # Phaser: bản đồ dạng chữ (maps.ts), ảnh pixel vẽ bằng code (textures.ts), WorldScene
    lib/            # logic thuần, có unit test: câu hỏi, chiến đấu, FSRS, XP, nhiệm vụ, chấm Writing, đồng bộ
    store/          # Zustand: dữ liệu lưu game (game.ts) và trạng thái giao diện (ui.ts)
    ui/             # React: HUD, hội thoại, chiến đấu, Sổ từ, Lò rèn, Nhiệm vụ, Nhân vật
  supabase/
    migrations/     # bảng profiles, player_stats, vocab_cards, quest_progress, ai_usage + RLS
    functions/      # npc-chat (stream hội thoại + nhận xét JSON), grade-writing (chấm band JSON)
  e2e/smoke.mjs     # kịch bản Playwright
```

Phaser (bản đồ) và React (mọi bảng/menu) nói chuyện qua `src/game/bus.ts`. Bản đồ sửa trực tiếp trong
`src/game/maps.ts` (mỗi ký tự là một ô — xem chú thích đầu file); test sẽ báo nếu bản đồ sai.

## Khác với kế hoạch ban đầu

- **90 từ** thay vì ~300: đủ cho 3 chủ đề của MVP; thêm từ chỉ cần thêm vào `src/content/vocab.*.json`.
- **Ảnh pixel vẽ bằng code** thay vì tileset Kenney, và **bản đồ dạng chữ** thay vì Tiled — không cần file nhị
  phân, dễ sửa; có thể thay bằng tileset thật sau mà không đụng tới logic.
- Màn chiến đấu làm bằng React (đè lên bản đồ Phaser) vì chủ yếu là câu hỏi/nút bấm.
- Edge Functions đã typecheck bằng Deno và chạy thử phần kiểm tra đầu vào/đăng nhập, nhưng **chưa gọi Claude
  thật** (môi trường phát triển chưa có API key) — cần kiểm tra lại sau khi deploy.

## Hướng phát triển tiếp

Hồ Thì Thầm (Listening), Thư viện Cổ (Reading), Đấu trường Hùng biện (Speaking Part 1–3), Tháp Band 9
(đề thi thử), nhánh nội dung TOEIC, hội nhóm & World Boss, PvP từ vựng, bảng xếp hạng theo mùa.
