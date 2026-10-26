import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Flag, Heart, MessageCircle, MessagesSquare, PenSquare, RefreshCw, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { openProfile } from '../lib/openProfile';
import { backdropProps } from '../lib/backdrop';

export const CATEGORIES = [
  ['pomodoro', '番茄鐘 / 專注'], ['active-recall', '主動回憶'], ['spaced', '間隔複習'], ['feynman', '費曼技巧'],
  ['notes', '筆記整理'], ['language', '語言學習'], ['exam', '考前衝刺'], ['other', '其他'],
];
const CAT_LABEL = Object.fromEntries(CATEGORIES);
const field = 'w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-500';
const chip = (on) => `shrink-0 rounded-full px-2.5 py-1 text-xs transition ${on ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`;
const dbMsg = (m = '') => (/forum_|schema cache|does not exist/i.test(m) ? '資料庫還沒有論壇功能：請到 Supabase → SQL Editor 執行 forum_guest.sql 一次。' : m);
const when = (iso) => { const d = new Date(iso); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const REASONS = '請選擇檢舉原因：輸入 1 = 侵害版權（抄襲 / 未經授權轉貼）、2 = 騷擾或不當內容、3 = 廣告或垃圾訊息、4 = 其他';
const REASON_MAP = { 1: '侵害版權', 2: '騷擾或不當內容', 3: '廣告或垃圾訊息', 4: '其他' };
/** 檢舉文章或留言（需登入）；檢舉會存進 forum_reports，站長到 Supabase 後台處理 */
async function report(userId, onRequireAuth, target) {
  if (!userId) { onRequireAuth?.('檢舉要先登入／註冊。'); return null; }
  const pick = window.prompt(REASONS);
  const reason = REASON_MAP[Number(pick)];
  if (!reason) return null;
  const note = (window.prompt('補充說明（選填，例如原作者或原文網址）') ?? '').slice(0, 300);
  const { error } = await supabase.from('forum_reports').insert({ ...target, reason, note: note || null });
  if (error) return dbMsg(error.message);
  window.alert('已收到檢舉，我們會盡快處理。');
  return null;
}
const cnt = (x) => (Array.isArray(x) ? x[0]?.count ?? 0 : 0);

/**
 * 讀書論壇：任何人（含訪客）都能看；發文 / 留言 / 按讚要先登入。
 * 可以分享自己的讀書方法，並標上分類與科目，大家可以留言討論。
 */
export default function ForumPanel({ userId, onClose, onRequireAuth }) {
  const [view, setView] = useState('list'); // list | new | detail
  const [posts, setPosts] = useState(null);
  const [liked, setLiked] = useState(new Set());
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setErr('');
    const { data, error } = await supabase.from('forum_posts')
      .select('id, user_id, author_name, title, body, category, subject, created_at, forum_likes(count), forum_comments(count)')
      .order('created_at', { ascending: false }).limit(100);
    if (error) { setErr(dbMsg(error.message)); setPosts([]); return; }
    setPosts((data ?? []).map((p) => ({ ...p, likes: cnt(p.forum_likes), comments: cnt(p.forum_comments) })));
    if (userId) {
      const r = await supabase.from('forum_likes').select('post_id').eq('user_id', userId);
      setLiked(new Set((r.data ?? []).map((x) => x.post_id)));
    }
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const need = (hint) => { if (userId) return true; onRequireAuth?.(hint); return false; };

  const toggleLike = async (post) => {
    if (!need('按讚要先登入／註冊。')) return;
    const has = liked.has(post.id);
    setLiked((s) => { const n = new Set(s); if (has) n.delete(post.id); else n.add(post.id); return n; });
    setPosts((ps) => ps.map((p) => (p.id === post.id ? { ...p, likes: p.likes + (has ? -1 : 1) } : p)));
    const { error } = has
      ? await supabase.from('forum_likes').delete().eq('post_id', post.id).eq('user_id', userId)
      : await supabase.from('forum_likes').insert({ post_id: post.id });
    if (error) { setErr(dbMsg(error.message)); load(); }
  };

  const removePost = async (post) => {
    if (!window.confirm('確定要刪除這篇文章嗎？')) return;
    const { error } = await supabase.from('forum_posts').delete().eq('id', post.id);
    if (error) { setErr(dbMsg(error.message)); return; }
    setPosts((ps) => ps.filter((p) => p.id !== post.id));
    setView('list'); setOpenId(null);
  };

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (posts ?? []).filter((p) => (cat === 'all' || p.category === cat)
      && (!kw || `${p.title} ${p.body} ${p.subject ?? ''} ${p.author_name}`.toLowerCase().includes(kw)));
  }, [posts, cat, q]);
  const current = posts?.find((p) => p.id === openId) ?? null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-2 sm:p-3" {...backdropProps(onClose)}>
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-2xl bg-stone-900 text-stone-200 shadow-2xl ring-1 ring-stone-700" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="讀書論壇">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            {view !== 'list' && (
              <button type="button" onClick={() => { setView('list'); setOpenId(null); }} aria-label="回到列表" className="rounded-lg p-1.5 hover:bg-stone-800"><ArrowLeft size={18} /></button>
            )}
            <h2 className="flex items-center gap-2 truncate text-lg font-semibold text-stone-100"><MessagesSquare size={18} className="shrink-0 text-amber-400" />讀書論壇</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {view === 'list' && (
              <>
                <button type="button" onClick={load} aria-label="重新整理" className="rounded-lg p-1.5 hover:bg-stone-800"><RefreshCw size={16} /></button>
                <button type="button" onClick={() => { if (need('發文要先登入／註冊，註冊完就能分享你的讀書方法。')) setView('new'); }}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"><PenSquare size={15} />分享讀書方法</button>
              </>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-stone-800" aria-label="關閉"><X size={18} /></button>
          </div>
        </div>

        {err && <p className="px-4 pt-2 text-sm text-rose-400">{err}</p>}

        {view === 'list' && (
          <>
            <div className="space-y-2 px-4 py-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋標題、內容、科目、作者…" className={field} />
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button type="button" onClick={() => setCat('all')} className={chip(cat === 'all')}>全部</button>
                {CATEGORIES.map(([k, v]) => <button key={k} type="button" onClick={() => setCat(k)} className={chip(cat === k)}>{v}</button>)}
              </div>
              {!userId && <p className="text-xs text-stone-500">你正以訪客身分瀏覽，可以自由閱讀；發文、留言、按讚時再登入就好。</p>}
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
              {!posts && <li className="text-sm text-stone-500">載入中…</li>}
              {posts && shown.length === 0 && !err && <li className="text-sm text-stone-500">{posts.length ? '沒有符合的文章。' : '還沒有人分享，當第一個吧！'}</li>}
              {shown.map((p) => (
                <li key={p.id}>
                  <div role="button" tabIndex={0} onClick={() => { setOpenId(p.id); setView('detail'); }} onKeyDown={(e) => { if (e.key === 'Enter') { setOpenId(p.id); setView('detail'); } }}
                    className="cursor-pointer rounded-xl bg-stone-800 p-3 hover:bg-stone-700/80">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded-full bg-amber-700/70 px-2 py-0.5 text-amber-50">{CAT_LABEL[p.category] ?? '其他'}</span>
                      {p.subject && <span className="rounded-full bg-stone-700 px-2 py-0.5 text-stone-300">{p.subject}</span>}
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-stone-100">{p.title}</h3>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-stone-400">{p.body}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                      <span><button type="button" onClick={(e) => { e.stopPropagation(); openProfile(p.user_id); }} className="text-stone-300 hover:underline">{p.author_name}</button>・{when(p.created_at)}</span>
                      <span className="flex items-center gap-3">
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleLike(p); }} className={`flex items-center gap-1 ${liked.has(p.id) ? 'text-rose-400' : 'hover:text-rose-300'}`} aria-label="按讚"><Heart size={13} fill={liked.has(p.id) ? 'currentColor' : 'none'} />{p.likes}</button>
                        <span className="flex items-center gap-1"><MessageCircle size={13} />{p.comments}</span>
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {view === 'new' && <NewPost onCancel={() => setView('list')} onCreated={() => { setView('list'); load(); }} />}

        {view === 'detail' && current && (
          <PostDetail post={current} userId={userId} liked={liked.has(current.id)} onLike={() => toggleLike(current)} onDelete={() => removePost(current)}
            onRequireAuth={onRequireAuth} onCommented={(d) => setPosts((ps) => ps.map((p) => (p.id === current.id ? { ...p, comments: p.comments + d } : p)))} />
        )}
        {view === 'detail' && !current && <p className="p-4 text-sm text-stone-500">找不到這篇文章（可能已被刪除）。</p>}
      </div>
    </div>
  );
}

function NewPost({ onCancel, onCreated }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('pomodoro');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = title.trim().length >= 2 && body.trim().length >= 10;
  const submit = async (e) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setErr('');
    const { error } = await supabase.from('forum_posts').insert({ title: title.trim(), body: body.trim(), category, subject: subject.trim() || null });
    setBusy(false);
    if (error) { setErr(dbMsg(error.message)); return; }
    onCreated();
  };
  return (
    <form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="標題（例：我用「番茄鐘＋錯題本」準備學測）" />
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={field} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="方法分類">
          {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={30} placeholder="適用科目（選填，例：英文、微積分）" />
      </div>
      <p className="text-[11px] text-stone-500">請只分享自己的心得或有授權的內容，不要整篇轉貼別人的文章、書籍或圖片；引用請註明出處。發布即表示你擁有這些內容的權利。</p>
      <textarea className={`${field} min-h-[11rem] resize-y`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000}
        placeholder={'分享你的讀書方法：怎麼做、為什麼有效、需要多久、有什麼小提醒…\n（至少 10 個字，最多 4000 字）'} />
      <div className="text-right text-[11px] text-stone-500">{body.length}/4000</div>
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg bg-stone-800 px-4 py-2 text-sm hover:bg-stone-700">取消</button>
        <button disabled={!ok || busy} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50">{busy ? '發布中…' : '發布'}</button>
      </div>
    </form>
  );
}

function PostDetail({ post, userId, liked, onLike, onDelete, onRequireAuth, onCommented }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    supabase.from('forum_comments').select('id, user_id, author_name, body, created_at').eq('post_id', post.id).order('created_at').then(({ data, error }) => {
      if (!alive) return;
      if (error) { setErr(dbMsg(error.message)); setComments([]); } else setComments(data ?? []);
    });
    return () => { alive = false; };
  }, [post.id]);

  const send = async (e) => {
    e.preventDefault();
    if (!userId) { onRequireAuth?.('留言要先登入／註冊。'); return; }
    const body = text.trim();
    if (!body) return;
    const { data, error } = await supabase.from('forum_comments').insert({ post_id: post.id, body }).select('id, user_id, author_name, body, created_at').single();
    if (error) { setErr(dbMsg(error.message)); return; }
    setComments((c) => [...(c ?? []), data]); setText(''); onCommented(1);
  };
  const delComment = async (c) => {
    const { error } = await supabase.from('forum_comments').delete().eq('id', c.id);
    if (error) { setErr(dbMsg(error.message)); return; }
    setComments((l) => l.filter((x) => x.id !== c.id)); onCommented(-1);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-amber-700/70 px-2 py-0.5 text-amber-50">{CAT_LABEL[post.category] ?? '其他'}</span>
          {post.subject && <span className="rounded-full bg-stone-700 px-2 py-0.5 text-stone-300">{post.subject}</span>}
        </div>
        <h3 className="text-xl font-semibold text-stone-100">{post.title}</h3>
        <div className="text-xs text-stone-500"><button type="button" onClick={() => openProfile(post.user_id)} className="text-stone-300 hover:underline">{post.author_name}</button>・{when(post.created_at)}</div>
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-stone-200">{post.body}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onLike} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${liked ? 'bg-rose-900/50 text-rose-300' : 'bg-stone-800 hover:bg-stone-700'}`}><Heart size={15} fill={liked ? 'currentColor' : 'none'} />{post.likes}</button>
          {userId !== post.user_id && (
            <button type="button" onClick={async () => { const m = await report(userId, onRequireAuth, { post_id: post.id }); if (m) setErr(m); }} className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-700"><Flag size={15} />檢舉</button>
          )}
          {userId && userId === post.user_id && (
            <button type="button" onClick={onDelete} className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-rose-300 hover:bg-stone-700"><Trash2 size={15} />刪除</button>
          )}
        </div>
        <div className="border-t border-stone-700 pt-3">
          <div className="mb-2 text-sm font-medium text-stone-300">留言（{comments?.length ?? post.comments}）</div>
          {err && <p className="mb-2 text-xs text-rose-400">{err}</p>}
          <ul className="space-y-2">
            {!comments && <li className="text-sm text-stone-500">載入中…</li>}
            {comments?.length === 0 && <li className="text-sm text-stone-500">還沒有留言。</li>}
            {comments?.map((c) => (
              <li key={c.id} className="rounded-lg bg-stone-800 p-2.5 text-sm">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span><button type="button" onClick={() => openProfile(c.user_id)} className="text-stone-300 hover:underline">{c.author_name}</button>・{when(c.created_at)}</span>
                  {userId === c.user_id
                    ? <button type="button" onClick={() => delComment(c)} aria-label="刪除留言" className="hover:text-rose-300"><Trash2 size={13} /></button>
                    : <button type="button" onClick={async () => { const m = await report(userId, onRequireAuth, { post_id: post.id, comment_id: c.id }); if (m) setErr(m); }} aria-label="檢舉留言" className="hover:text-amber-300"><Flag size={13} /></button>}
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-stone-200">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-stone-700 p-3">
        {userId
          ? <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="寫下你的想法或心得…" className={`${field} min-w-0 flex-1`} />
          : <button type="button" onClick={() => onRequireAuth?.('留言要先登入／註冊。')} className="min-w-0 flex-1 rounded-lg bg-stone-800 py-2 text-sm text-amber-200 hover:bg-stone-700">登入 / 註冊後才能留言</button>}
        {userId && <button disabled={!text.trim()} className="rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-40">送出</button>}
      </form>
    </div>
  );
}
