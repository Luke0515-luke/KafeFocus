-- =====================================================================
-- KafeFocus：自動讀書計畫 + 甘特圖 + 獎勵 + 排行榜
-- 貼到 Supabase Dashboard → SQL Editor 執行一次即可（可重複執行）。
-- 前提：已執行過 schema.sql 與 cafes_calendar_24_seats.sql（需要 profiles / focus_logs / calendar_events）。
-- =====================================================================

-- 1. 讀書項目（使用者輸入的原始需求）
create table if not exists public.study_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 60),
  note        text check (note is null or char_length(note) <= 300),
  est_minutes int  not null check (est_minutes between 5 and 12000),
  deadline    date not null,
  start_date  date,
  difficulty  int  not null default 2 check (difficulty between 1 and 3),
  weekdays    int[] not null default '{0,1,2,3,4,5,6}',
  windows     text[] not null default '{morning,afternoon,evening}',
  review      boolean not null default true,
  color       text not null default '#f59e0b',
  created_at  timestamptz not null default now()
);
create index if not exists study_items_user_idx on public.study_items(user_id, deadline);

-- 2. 系統排出來的每日區塊
create table if not exists public.study_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id      uuid not null references public.study_items(id) on delete cascade,
  kind         text not null default 'study' check (kind in ('study','review')),
  plan_date    date not null,
  start_time   time,
  minutes      int  not null check (minutes between 1 and 240),
  done         boolean not null default false,
  completed_on date,
  completed_at timestamptz
);
create index if not exists study_sessions_user_date_idx on public.study_sessions(user_id, plan_date);

-- 3. 個人排程偏好（每日上限、時段、作息型態）
create table if not exists public.study_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  prefs   jsonb not null default '{}'::jsonb
);

-- 4. 獎勵流水帳（經驗值 = 加總；只能由 RPC 寫入）
create table if not exists public.study_rewards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.study_sessions(id) on delete set null,
  item_id    uuid references public.study_items(id) on delete set null,
  kind       text not null check (kind in ('session','item_complete','day_clear','streak','badge')),
  ref        text not null,
  label      text not null,
  xp         int  not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index if not exists study_rewards_user_idx on public.study_rewards(user_id);

-- 5. RLS
alter table public.study_items    enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_prefs    enable row level security;
alter table public.study_rewards  enable row level security;

drop policy if exists "own items all" on public.study_items;
create policy "own items all" on public.study_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 區塊：前端只能讀；新增 / 完成一律走 RPC（避免偽造完成狀態與獎勵）
drop policy if exists "own sessions select" on public.study_sessions;
create policy "own sessions select" on public.study_sessions for select to authenticated using (user_id = auth.uid());

drop policy if exists "own prefs all" on public.study_prefs;
create policy "own prefs all" on public.study_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own rewards select" on public.study_rewards;
create policy "own rewards select" on public.study_rewards for select to authenticated using (user_id = auth.uid());

-- 6. 重新排程：刪掉「未完成」的區塊，換成前端演算法算出的新區塊（已完成的保留）
create or replace function public.replace_study_plan(p_sessions jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if jsonb_typeof(p_sessions) <> 'array' or jsonb_array_length(p_sessions) > 3000 then raise exception 'bad_payload'; end if;
  delete from public.study_sessions where user_id = v_uid and not done;
  insert into public.study_sessions (user_id, item_id, kind, plan_date, start_time, minutes)
  select v_uid, (e->>'item_id')::uuid,
         case when e->>'kind' = 'review' then 'review' else 'study' end,
         (e->>'plan_date')::date, nullif(e->>'start_time','')::time,
         least(240, greatest(1, (e->>'minutes')::int))
  from jsonb_array_elements(p_sessions) e
  where exists (select 1 from public.study_items i where i.id = (e->>'item_id')::uuid and i.user_id = v_uid);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- 7. 完成 / 取消完成一個區塊，並結算獎勵
create or replace function public.complete_study_session(p_session_id uuid, p_today date, p_done boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s public.study_sessions; it public.study_items;
  v_prior int; v_eff int; v_xp int; v_n int; v_streak int := 0; d date;
  v_bonus jsonb := '[]'::jsonb; v_total int; v_prev int; v_mins bigint; v_done_cnt int; r record;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_today is null or abs(p_today - current_date) > 1 then raise exception 'bad_date'; end if;
  select * into s from public.study_sessions where id = p_session_id and user_id = v_uid for update;
  if not found then raise exception 'session_not_found'; end if;

  select coalesce(sum(xp),0) into v_prev from public.study_rewards where user_id = v_uid;

  if not p_done then
    update public.study_sessions set done = false, completed_on = null, completed_at = null where id = s.id;
    delete from public.study_rewards where user_id = v_uid and session_id = s.id;
    select coalesce(sum(xp),0) into v_total from public.study_rewards where user_id = v_uid;
    return jsonb_build_object('undone', true, 'total_xp', v_total, 'level', floor(sqrt(v_total/50.0))::int + 1);
  end if;
  if s.done then return jsonb_build_object('already', true, 'total_xp', v_prev); end if;
  if s.plan_date > p_today then raise exception 'future_session'; end if;

  select * into it from public.study_items where id = s.item_id;
  update public.study_sessions set done = true, completed_on = p_today, completed_at = now() where id = s.id;

  -- 每天最多 600 分鐘計入經驗值（防止灌水）
  select coalesce(sum(minutes),0) into v_prior from public.study_sessions
    where user_id = v_uid and done and completed_on = p_today and id <> s.id;
  v_eff := greatest(0, least(s.minutes, 600 - v_prior));
  v_xp  := round(v_eff * (1 + 0.25 * (coalesce(it.difficulty,1) - 1)));
  insert into public.study_rewards(user_id, session_id, item_id, kind, ref, label, xp)
  values (v_uid, s.id, s.item_id, 'session', s.id::text,
          case when s.kind = 'review' then '複習 ' else '完成 ' end || s.minutes || ' 分鐘', v_xp)
  on conflict do nothing;

  -- 項目全部完成
  if not exists (select 1 from public.study_sessions where item_id = s.item_id and not done) then
    insert into public.study_rewards(user_id, session_id, item_id, kind, ref, label, xp)
    values (v_uid, s.id, s.item_id, 'item_complete', s.item_id::text, '🏁 項目完成：' || coalesce(it.title,''), 50)
    on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n > 0 then v_bonus := v_bonus || jsonb_build_object('label', '🏁 項目完成：' || coalesce(it.title,''), 'xp', 50); end if;
  end if;

  -- 今日全勝
  if (select count(*) from public.study_sessions where user_id = v_uid and plan_date = p_today) > 0
     and not exists (select 1 from public.study_sessions where user_id = v_uid and plan_date = p_today and not done) then
    insert into public.study_rewards(user_id, session_id, kind, ref, label, xp)
    values (v_uid, s.id, 'day_clear', p_today::text, '☀️ 今日計畫全數完成', 30) on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n > 0 then v_bonus := v_bonus || jsonb_build_object('label', '☀️ 今日計畫全數完成', 'xp', 30); end if;
  end if;

  -- 連續天數
  d := p_today;
  while v_streak < 400 and exists (select 1 from public.study_sessions where user_id = v_uid and done and completed_on = d) loop
    v_streak := v_streak + 1; d := d - 1;
  end loop;
  if v_streak in (3, 7, 14, 30, 60, 100) then
    insert into public.study_rewards(user_id, session_id, kind, ref, label, xp)
    values (v_uid, s.id, 'streak', 'streak' || v_streak || '@' || p_today, '🔥 連續 ' || v_streak || ' 天', v_streak * 5)
    on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n > 0 then v_bonus := v_bonus || jsonb_build_object('label', '🔥 連續 ' || v_streak || ' 天', 'xp', v_streak * 5); end if;
  end if;

  -- 徽章
  select coalesce(sum(minutes),0), count(*) into v_mins, v_done_cnt from public.study_sessions where user_id = v_uid and done;
  begin
    for r in select * from (values
      ('first_step', '🌱 初來乍到', v_done_cnt >= 1),
      ('item_done',  '🏆 完成者', exists (select 1 from public.study_rewards where user_id = v_uid and kind = 'item_complete')),
      ('streak3',    '🔥 三日連勝', v_streak >= 3),
      ('streak7',    '🌟 七日不間斷', v_streak >= 7),
      ('hours10',    '☕ 累積 10 小時', v_mins >= 600),
      ('hours50',    '📚 累積 50 小時', v_mins >= 3000),
      ('hours100',   '🎓 累積 100 小時', v_mins >= 6000)
    ) as b(code, label, ok) where ok loop
      insert into public.study_rewards(user_id, session_id, kind, ref, label, xp)
      values (v_uid, s.id, 'badge', r.code, r.label, 10) on conflict do nothing;
      get diagnostics v_n = row_count;
      if v_n > 0 then v_bonus := v_bonus || jsonb_build_object('label', '徽章 ' || r.label, 'xp', 10); end if;
    end loop;
  end;

  select coalesce(sum(xp),0) into v_total from public.study_rewards where user_id = v_uid;
  return jsonb_build_object(
    'xp_gained', v_xp, 'capped', v_eff < s.minutes, 'bonuses', v_bonus, 'streak', v_streak,
    'total_xp', v_total, 'level', floor(sqrt(v_total/50.0))::int + 1,
    'prev_level', floor(sqrt(v_prev/50.0))::int + 1);
end $$;

-- 8. 排行榜（讀書時間 = 咖啡廳專注計時「完整跑完」的分鐘數，來自 focus_logs）
create or replace function public.study_leaderboard(p_day_start timestamptz, p_sort text default 'total', p_limit int default 50)
returns table (rank bigint, user_id uuid, display_name text, avatar_url text, total_minutes bigint, today_minutes bigint, xp bigint, level int)
language sql security definer set search_path = public stable as $$
  with agg as (
    select p.id, p.display_name, p.avatar_url,
           coalesce(f.total, 0) as total, coalesce(f.today, 0) as today, coalesce(r.xp, 0) as xp
    from public.profiles p
    left join (select l.user_id, sum(l.minutes) total, sum(l.minutes) filter (where l.started_at >= p_day_start) today
               from public.focus_logs l group by l.user_id) f on f.user_id = p.id
    left join (select w.user_id, sum(w.xp) xp from public.study_rewards w group by w.user_id) r on r.user_id = p.id
  ), ranked as (
    select a.*, row_number() over (
      order by case p_sort when 'today' then a.today when 'xp' then a.xp else a.total end desc, a.total desc, a.display_name) rk
    from agg a
  )
  select rk, id, display_name, avatar_url, total, today, xp, floor(sqrt(xp/50.0))::int + 1
  from ranked where rk <= least(greatest(p_limit,1),200) or id = auth.uid() order by rk;
$$;

-- 9. 點某位使用者的名字看到的資料卡
create or replace function public.study_user_card(p_user_id uuid, p_day_start timestamptz, p_today date)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare p public.profiles; v_total bigint; v_today bigint; v_xp bigint; v_streak int := 0; d date; v_badges jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into p from public.profiles where id = p_user_id;
  if not found then return null; end if;
  select coalesce(sum(minutes),0), coalesce(sum(minutes) filter (where started_at >= p_day_start),0)
    into v_total, v_today from public.focus_logs where user_id = p_user_id;
  select coalesce(sum(xp),0) into v_xp from public.study_rewards where user_id = p_user_id;
  select coalesce(jsonb_agg(label order by created_at), '[]'::jsonb) into v_badges
    from public.study_rewards where user_id = p_user_id and kind = 'badge';
  d := p_today;
  if not exists (select 1 from public.study_sessions where user_id = p_user_id and done and completed_on = d) then d := d - 1; end if;
  while v_streak < 400 and exists (select 1 from public.study_sessions where user_id = p_user_id and done and completed_on = d) loop
    v_streak := v_streak + 1; d := d - 1;
  end loop;
  return jsonb_build_object('id', p.id, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
    'total_minutes', v_total, 'today_minutes', v_today, 'xp', v_xp,
    'level', floor(sqrt(v_xp/50.0))::int + 1, 'streak', v_streak, 'badges', v_badges);
end $$;

revoke execute on function public.replace_study_plan(jsonb)                       from public, anon;
revoke execute on function public.complete_study_session(uuid,date,boolean)       from public, anon;
revoke execute on function public.study_leaderboard(timestamptz,text,int)         from public, anon;
revoke execute on function public.study_user_card(uuid,timestamptz,date)          from public, anon;
grant  execute on function public.replace_study_plan(jsonb)                       to authenticated;
grant  execute on function public.complete_study_session(uuid,date,boolean)       to authenticated;
grant  execute on function public.study_leaderboard(timestamptz,text,int)         to authenticated;
grant  execute on function public.study_user_card(uuid,timestamptz,date)          to authenticated;
