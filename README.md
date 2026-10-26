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

## 5. 主題專屬桌椅、榻榻米跪坐、北歐咖啡廳
- 每個主題可用 `theme.furniture` 指定自己的桌椅（`src/components/cafe/ThemeFurniture.jsx`）：`neon` 玻璃桌＋發光賽博椅、`nordic` 原木桌＋布面椅、`zen` 矮茶几＋布座墊。
- `櫻語茶屋`（zen-tea）：榻榻米地板，角色改為跪坐（`sitPose.js` 的 kneel 姿勢）。
- `北歐暖光咖啡館`（nordic-cafe）：新增，SQL 為 `new_nordic_cafe.sql`。

## 6. 訪客瀏覽、讀書論壇、咖啡豆等級、聊天室名稱
- **訪客可以先逛**：沒登入也能看大廳、進咖啡廳房間、看大家讀書、看排行榜與論壇。只有「新增行程 / 讀書計畫」「入座」「聊天」「發文留言按讚」時才會跳出登入／註冊視窗（`AuthGate.jsx` 不再擋人，`AuthPanel.jsx` 新增 `modal` 模式）。
- **讀書論壇**：`ForumPanel.jsx`（大廳與咖啡廳面板都有「讀書論壇」按鈕）。可分享讀書方法、選分類與科目、搜尋、按讚、留言，只能刪自己的文章／留言。SQL：`forum_guest.sql`。
- **咖啡豆種子等級**：`src/lib/openProfile.js` 的 `BEANS` 共 20 種（生豆種子 → 巴西聖多斯 → … → 耶加雪菲 → 藍山 → 藝伎 → 競標級藝伎）。完成整個讀書項目（完成者）會自動直升下一級（`study_planner.sql` 的 `level_jump` 獎勵）。資料卡有咖啡豆圖鑑。
- **聊天室名稱**：聊天室標題與訊息署名都改用用戶名（顯示名稱 → 註冊時填的名稱 → Email 前綴）。

### 部署順序
1. Supabase → SQL Editor 重新執行 `study_planner.sql`（可重複執行）。
2. 再執行新的 `forum_guest.sql`。
3. 重新部署前端。

## 7. 介面與效能優化（電腦 / 手機）
- **大廳秒開**：3D 場景改為「進咖啡廳才下載」（`React.lazy`），大型套件拆成獨立檔案（`vite.config.js`）。大廳首次載入從單一約 1.5 MB 的檔案，變成約 0.5 MB（react + supabase + 本站程式，gzip 約 150 KB）；three / r3f（約 0.9 MB）要進咖啡廳才會下載。
- **大廳**：我的狀態卡（目前咖啡豆、經驗條、今天專注時間）、搜尋咖啡廳、排序（人少 / 人多優先）、「隨機進一間」；手機上按鈕改成滿版圖示列，並避開瀏覽器安全區。
- **專注體驗**：手機專注時螢幕不熄滅（Wake Lock）、時間到且分頁在背景時送出系統通知、`Esc` 關閉最上層視窗。
- `index.html`：`viewport-fit=cover`、`theme-color`、網頁描述。
