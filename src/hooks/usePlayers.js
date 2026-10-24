import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { buildNav } from '../components/cafe/nav';

const SPEED = 1.7;            // 走路速度（公尺／秒）
const SEND_MS = 200;          // 位置廣播間隔（走動時）
const IDLE_BEAT_MS = 3000;    // 站著不動時的「我還在」心跳，讓剛進來的人也看得到我
const STALE_MS = 9000;        // 超過這麼久沒收到某人的訊息就當他離開了
const BUBBLE_MS = 7000;
const MAX_MESSAGES = 80;
const MAX_TEXT = 120;
const CHAT_GAP_MS = 900;      // 兩則訊息最短間隔（防洗版）
const SPAWN = { x: 2.5, z: 7.2 };

const dampAngle = (cur, target, lambda, dt) => {
  let d = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return cur + d * (1 - Math.exp(-lambda * dt));
};

const num = (v, lim) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim;
const cleanText = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * 咖啡廳裡「站著、走動、聊天」的即時層（和座位資料分開，不用改資料庫）：
 *  - 位置與聊天都走 Supabase Realtime 的 Broadcast（廣播）頻道 `room:<cafeId>`，訊息不會存進資料庫；
 *  - 自己的移動在本地模擬（A* 尋路），每 200ms 廣播一次位置，別人收到後在畫面上平滑地追過去；
 *  - 入座的人以座位資料為準（坐著打字/看書/喝咖啡），所以站著的角色只顯示「沒有入座」的人。
 */
export function usePlayers({ cafeId, userId, name, avatarUrl, theme, mySeat, onSit }) {
  const nav = useMemo(() => buildNav(theme), [theme]);

  // ---- 自己 ----
  const meRef = useRef(null);
  if (!meRef.current) {
    const p = nav.nearestFree(SPAWN.x, SPAWN.z);
    meRef.current = { x: p.x, z: p.z, rot: Math.PI, moving: false };
  }
  const pathRef = useRef([]);
  const pendingSeatRef = useRef(null);
  const destRef = useRef({ x: 0, z: 0, active: false });
  const seatedRef = useRef(!!mySeat);
  const lastSeatRef = useRef(mySeat);
  const heading = useRef(Math.PI);

  // 最新值放 ref，rAF / 計時器裡讀取就不會拿到舊的
  const latest = useRef({});
  latest.current = { name, avatarUrl, onSit, nav };

  // ---- 別人與聊天 ----
  const othersRef = useRef(new Map());   // id -> { ref:{current}, name, avatar, last }
  const [others, setOthers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [bubbles, setBubbles] = useState({});
  const channelRef = useRef(null);
  const readyRef = useRef(false);
  const lastChatAt = useRef(0);

  const syncOthers = useCallback(() => {
    setOthers([...othersRef.current.entries()].map(([id, o]) => ({ id, name: o.name, avatar: o.avatar, ref: o.ref })));
  }, []);

  // ---- 入座 / 離座：入座時停下腳步，離座時站在椅子旁邊 ----
  useEffect(() => {
    const prev = lastSeatRef.current;
    seatedRef.current = !!mySeat;
    if (mySeat) {
      pathRef.current = [];
      pendingSeatRef.current = null;
      destRef.current.active = false;
      meRef.current.moving = false;
    } else if (prev) {
      // 剛從座位站起來：試著站到椅子後方 / 兩側第一個走得到的位置
      const f = { x: Math.sin(prev.rot_y), z: Math.cos(prev.rot_y) };
      const side = { x: f.z, z: -f.x };
      const tries = [[-0.7, 0], [0, 0.7], [0, -0.7], [0.7, 0], [-1.1, 0.5], [-1.1, -0.5]];
      let spot = null;
      for (const [fa, sa] of tries) {
        const x = prev.pos_x + f.x * fa + side.x * sa;
        const z = prev.pos_z + f.z * fa + side.z * sa;
        if (nav.isFree(x, z)) { spot = { x, z }; break; }
      }
      spot ??= nav.nearestFree(prev.pos_x, prev.pos_z);
      const me = meRef.current;
      me.x = spot.x; me.z = spot.z; me.rot = prev.rot_y + Math.PI; me.moving = false;
      heading.current = me.rot;
    }
    lastSeatRef.current = mySeat;
  }, [mySeat, nav]);

  // ---- 自己的移動模擬 ----
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const me = meRef.current;
      const path = pathRef.current;
      if (seatedRef.current || path.length === 0) { me.moving = false; return; }

      let remaining = SPEED * dt;
      while (remaining > 0 && path.length) {
        const p = path[0];
        const dx = p.x - me.x; const dz = p.z - me.z;
        const d = Math.hypot(dx, dz);
        if (d > 1e-4) heading.current = Math.atan2(dx, dz);
        if (d <= remaining) { me.x = p.x; me.z = p.z; remaining -= d; path.shift(); }
        else { me.x += (dx / d) * remaining; me.z += (dz / d) * remaining; remaining = 0; }
      }
      me.rot = dampAngle(me.rot, heading.current, 14, dt);
      me.moving = path.length > 0;

      if (path.length === 0) {
        destRef.current.active = false;
        const seat = pendingSeatRef.current;
        pendingSeatRef.current = null;
        if (seat) latest.current.onSit?.(seat);   // 走到椅子旁邊了 → 入座
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- 頻道：位置 + 聊天 ----
  useEffect(() => {
    if (!cafeId || !userId) return undefined;
    const ch = supabase.channel(`room:${cafeId}`, { config: { broadcast: { self: false } } });
    channelRef.current = ch;
    readyRef.current = false;

    ch.on('broadcast', { event: 'pos' }, ({ payload: p }) => {
      if (!p || typeof p.id !== 'string' || p.id === userId || !num(p.x, 30) || !num(p.z, 30)) return;
      const map = othersRef.current;
      const rot = num(p.r, 20) ? p.r : 0;
      const nm = cleanText(p.name, 24) || '同學';
      const av = typeof p.av === 'string' ? p.av.slice(0, 300) : null;
      let o = map.get(p.id);
      if (!o) {
        o = { ref: { current: { x: p.x, z: p.z, rot, moving: !!p.m } }, name: nm, avatar: av, last: Date.now() };
        map.set(p.id, o);
        syncOthers();
      } else {
        const s = o.ref.current;
        s.x = p.x; s.z = p.z; s.rot = rot; s.moving = !!p.m;
        o.last = Date.now();
        if (o.name !== nm || o.avatar !== av) { o.name = nm; o.avatar = av; syncOthers(); }
      }
    });

    ch.on('broadcast', { event: 'chat' }, ({ payload: p }) => {
      if (!p || typeof p.uid !== 'string' || p.uid === userId) return;
      const text = cleanText(p.text, MAX_TEXT);
      if (!text) return;
      const msg = { id: typeof p.id === 'string' ? p.id.slice(0, 40) : uid(), uid: p.uid, name: cleanText(p.name, 24) || '同學', text, t: Date.now() };
      setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
      setBubbles((prev) => ({ ...prev, [msg.uid]: { text, until: Date.now() + BUBBLE_MS } }));
    });

    ch.subscribe((status) => { readyRef.current = status === 'SUBSCRIBED'; });

    // 定期清掉離開的人
    const gc = setInterval(() => {
      const now = Date.now();
      let changed = false;
      othersRef.current.forEach((o, id) => { if (now - o.last > STALE_MS) { othersRef.current.delete(id); changed = true; } });
      if (changed) syncOthers();
    }, 2000);

    return () => {
      clearInterval(gc);
      readyRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(ch);
      othersRef.current.clear();
      setOthers([]);
    };
  }, [cafeId, userId, syncOthers]);

  // ---- 位置廣播（走動時 5 次／秒，站著不動時每 3 秒一次） ----
  useEffect(() => {
    if (!cafeId || !userId) return undefined;
    let lastSent = 0;
    let lastKey = '';
    const id = setInterval(() => {
      const ch = channelRef.current;
      if (!ch || !readyRef.current || seatedRef.current) return;
      const me = meRef.current;
      const now = Date.now();
      const key = `${me.x.toFixed(2)},${me.z.toFixed(2)},${me.moving ? 1 : 0}`;
      if (key === lastKey && now - lastSent < IDLE_BEAT_MS) return;
      lastKey = key; lastSent = now;
      ch.send({
        type: 'broadcast', event: 'pos',
        payload: {
          id: userId, name: latest.current.name ?? '同學', av: latest.current.avatarUrl ?? null,
          x: +me.x.toFixed(2), z: +me.z.toFixed(2), r: +me.rot.toFixed(2), m: me.moving,
        },
      });
    }, SEND_MS);
    return () => clearInterval(id);
  }, [cafeId, userId]);

  // ---- 動作 ----
  /** 走到地板上的某一點（座位中不能走：要先離座） */
  const walkTo = useCallback((x, z) => {
    if (seatedRef.current) return false;
    const me = meRef.current;
    const nv = latest.current.nav;
    const goal = nv.nearestFree(x, z);
    const path = nv.findPath({ x: me.x, z: me.z }, goal);
    if (!path) return false;
    pendingSeatRef.current = null;
    pathRef.current = path;
    destRef.current = { x: goal.x, z: goal.z, active: path.length > 0 };
    return true;
  }, []);

  /** 點座位：站著就先走過去再坐；已經坐著就直接換位 */
  const sitAt = useCallback((seat) => {
    if (seatedRef.current) { latest.current.onSit?.(seat); return; }
    const me = meRef.current;
    const nv = latest.current.nav;
    let best = null;
    const consider = (c) => {
      if (!nv.isFree(c.x, c.z)) return;
      const path = nv.findPath({ x: me.x, z: me.z }, c);
      if (!path) return;
      let len = 0; let px = me.x; let pz = me.z;
      path.forEach((p) => { len += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; });
      if (!best || len < best.len) best = { path, len, c };
    };
    // 先試座位周圍 0.62 公尺，卡座這種被牆和桌子夾住的位子再放寬到 1.0、1.4 公尺
    for (const r of [0.62, 1.0, 1.4]) {
      for (let k = 0; k < 8; k += 1) {
        const a = (k * Math.PI) / 4;
        consider({ x: seat.pos_x + Math.sin(a) * r, z: seat.pos_z + Math.cos(a) * r });
      }
      if (best) break;
    }
    if (!best) consider(nv.nearestFree(seat.pos_x, seat.pos_z));
    if (!best) { latest.current.onSit?.(seat); return; }   // 找不到路：直接入座
    if (best.len < 0.8) { latest.current.onSit?.(seat); return; }
    pathRef.current = best.path;
    pendingSeatRef.current = seat;
    destRef.current = { x: seat.pos_x, z: seat.pos_z, active: true };
  }, []);

  const sendChat = useCallback((raw) => {
    const text = cleanText(raw, MAX_TEXT);
    const now = Date.now();
    if (!text || now - lastChatAt.current < CHAT_GAP_MS) return false;
    lastChatAt.current = now;
    const nm = cleanText(latest.current.name, 24) || '同學';
    const msg = { id: uid(), uid: userId, name: nm, text, t: now };
    setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
    setBubbles((prev) => ({ ...prev, [userId]: { text, until: now + BUBBLE_MS } }));
    channelRef.current?.send({ type: 'broadcast', event: 'chat', payload: { id: msg.id, uid: userId, name: nm, text } });
    return true;
  }, [userId]);

  return { meRef, destRef, showMe: !mySeat, others, messages, bubbles, walkTo, sitAt, sendChat };
}
