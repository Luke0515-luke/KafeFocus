把背景音樂 mp3 放在這個資料夾，檔名要和 src/config/playlist.js 的 file 欄位完全一致（小寫、連字號）：

  peaceful-cafe-background-music-with-soft-dynamics.mp3
  warm-cafe-background-music-without-drums.mp3
  cocktail-jazz-coffee-shop-light-trio.mp3
  cool-jazz-sunny-cafe-quiet-free-form.mp3
  cocktail-jazz-rainy-night-slow-piano-set.mp3
  cool-jazz-midnight-club-without-a-pulse.mp3

來源：Free Music Archive → Alex Morgan →《Jazz Cafe & Coffee Shop》Vol.1 / Vol.2（需登入 FMA 才能下載）。
授權：專輯頁標示 CC BY 4.0，使用時必須標示作者；網站右下角的音樂列已固定顯示作者、授權與來源連結。
下載後請到每首歌的頁面再確認一次授權。

建議：原檔是 320kbps，每首約 5~6 MB。想縮小可用 ffmpeg 轉成 128kbps：
  ffmpeg -i 原檔.mp3 -b:a 128k 檔名.mp3
