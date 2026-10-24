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
