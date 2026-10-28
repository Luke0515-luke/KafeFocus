/**
 * 大廳每間咖啡廳的人數，規則和「進到咖啡廳裡看到的」完全一樣（useCafeRealtime.js）：
 *   在線 online  = 該咖啡廳 Presence 裡的人（坐著、站著、走動都算）。進去後左上角的人數就是這個。
 *   入座 seated  = 資料庫裡有人的座位，而且那個人還在 Presence 裡（不在線的視為幽靈座位 → 當作空位）。
 * 兩個數字都以 Presence 為準，所以「裡面沒人大廳卻顯示有人」、「裡面有人大廳卻顯示沒有」都不會發生。
 *
 * 只有「這間咖啡廳的 Presence 連線還沒同步 / 連不上」時，才退回資料庫的心跳計數（cafe_seat_counts），
 * 這種情況數字可能晚個一兩分鐘，但不會用到會留著幽靈座位的原始座位資料。
 *
 * @param presenceIds  該店線上使用者 id 的 Set；undefined = 尚未同步
 * @param db           { total, occupants: string[], heartbeatTaken: number | null }
 */
export function lobbyStats(presenceIds, db) {
  const total = db?.total ?? 0;
  if (presenceIds) {
    const seated = (db?.occupants ?? []).filter((id) => presenceIds.has(id)).length;
    return { online: presenceIds.size, seated, total, live: true };
  }
  const fallback = db?.heartbeatTaken ?? 0;
  return { online: fallback, seated: fallback, total, live: false };
}
