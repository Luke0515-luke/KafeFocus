# 街角自習咖啡廳 MVP

## 1. 建立專案與安裝套件
```bash
npm create vite@latest study-cafe -- --template react
cd study-cafe
npm i three @react-three/fiber @react-three/drei @supabase/supabase-js lucide-react
npm i -D tailwindcss @tailwindcss/vite     # Tailwind v4；v3 請照官方文件設定
```
把本資料夾的 `src/` 覆蓋進去（`App.jsx` 取代原本的；`main.jsx` 維持 Vite 預設即可），
Tailwind v4 在 `src/index.css` 第一行放 `@import "tailwindcss";`，並在 `vite.config.js` 加入 `@tailwindcss/vite` 外掛。

## 2. Supabase
1. 建立專案 → Authentication → Providers → Email：開發階段可先關閉 "Confirm email"。
2. SQL Editor 貼上並執行 `supabase/schema.sql`（已跑過舊版 6 座位的人改跑 `upgrade_to_12_seats.sql`）。
3. 若 `pg_cron` 報錯：Database → Extensions 啟用 pg_cron 後重跑最後兩段。
4. `.env.local`：
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
5. `npm run dev`，開兩個瀏覽器（一個無痕）註冊不同帳號即可看到彼此入座。

## 3. 讀書計畫 / 甘特圖 / 排行榜 / 獎勵（新功能）
1. Supabase → SQL Editor 執行 `study_planner.sql`（需先執行過 `cafes_calendar_24_seats.sql`）。
2. 大廳或咖啡廳左上角面板 →「讀書計畫」：新增項目（內容、預計時數、難度、最晚完成日、打算讀的星期與時段），系統自動排好每天的區塊並畫出甘特圖。
3. 每個區塊讀完就勾選 → 獲得 XP、連續天數、徽章、升級；「排行榜」可看今日 / 累計 / 經驗值排名，點任何名字（排行榜、聊天室、3D 場景名牌）可看總讀書時間與今天讀書時間。
4. 排程演算法在 `src/lib/scheduler.js`（分散練習、交錯練習、間隔複習、時間緩衝、晝夜節律、避開行事曆行程）。

## 4. 新咖啡廳與小功能
- `雨夜霓虹`（neon-rain）：霓虹招牌、全像菜單、自動販賣機、街機、吊掛燈管、地上水窪反光，不使用鋼琴／書櫃／植栽。SQL：`new_neon_cafe.sql`。
- `櫻語茶屋`（zen-tea）：拉門紙窗、紙燈籠、盆栽櫻花、暖簾、鳥居。SQL：`new_zen_cafe.sql`。
- 專屬擺飾在 `src/components/cafe/ThemeDecor.jsx`；主題以 `theme.decor` 啟用。
- 專注面板顯示「今日計畫」，選一個開始專注，跑完整輪會自動完成該區塊並給 XP；分頁標題顯示倒數、時間到會響提示音。
