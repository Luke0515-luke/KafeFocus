// 與 DB check constraint 相同的白名單：只接受 Ready Player Me 的 .glb
const RPM_RE = /^https:\/\/models\.readyplayer\.me\/[A-Za-z0-9_-]+\.glb(\?[A-Za-z0-9=&_.,%-]*)?$/;

/** 回傳可安全載入的網址；不合法回傳 null（呼叫端改用占位角色）。 */
export function sanitizeAvatarUrl(raw) {
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!RPM_RE.test(url)) return null;
  // 沒帶參數時加 quality=low：貼圖與網格較小，多人同場時載入與 GPU 負擔差很多
  return url.includes('?') ? url : `${url}?quality=low`;
}
