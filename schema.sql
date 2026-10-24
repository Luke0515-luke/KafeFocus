-- =====================================================================
-- 3D 自習咖啡廳 MVP schema（貼到 Supabase Dashboard → SQL Editor 執行）
-- 設計原則：
--   1. 前端只能「讀」表；所有寫入都走 RPC（security definer），避免偽造他人座位。
--   2. 座位佔用用 UPDATE ... WHERE occupant_id IS NULL 做原子搶座，不會雙重入座。
--   3. 斷線處理三層：Presence（秒級，畫面即時隱藏）→ pagehide/unmount 主動釋放
--      → pg_cron 依 heartbeat 兜底清理（保證 DB 不留幽靈座位）。
-- =====================================================================

-- ---------- 1. profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '同學' check (char_length(display_name) between 1 and 24),
  -- 只允許 Ready Player Me 的 .glb，避免被塞入任意網址（所有玩家的瀏覽器都會去載入）
  avatar_url   text check (
    avatar_url is null
    or avatar_url ~ '^https://models\.readyplayer\.me/[A-Za-z0-9_-]+\.glb(\?[A-Za-z0-9=&_.,%-]*)?$'
  ),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- 2. cafes ----------
create table if not exists public.cafes (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ---------- 3. cafe_seats ----------
create table if not exists public.cafe_seats (
  id                  uuid primary key default gen_random_uuid(),
  cafe_id             uuid not null references public.cafes(id) on delete cascade,
  seat_index          int  not null,
  -- 座位座標：pos_y 是「椅面高度」（公尺），rot_y 是面向（弧度，0 = 面向 +Z）
  pos_x               real not null,
  pos_y               real not null default 0.45,
  pos_z               real not null,
  rot_y               real not null default 0,
  -- 佔用者狀態（入座時從 profiles 複製一份，Realtime payload 就不用再 join）
  occupant_id         uuid references public.profiles(id) on delete set null,
  occupant_name       text,
  occupant_avatar_url text,
  status              text not null default 'empty' check (status in ('empty','studying','break')),
  task                text,
  phase_started_at    timestamptz,
  phase_ends_at       timestamptz,  -- 倒數結束時間（伺服器時間）；前端用它自己算剩餘秒數，不必每秒同步
  updated_at          timestamptz not null default now(),
  unique (cafe_id, seat_index)
);
create index if not exists cafe_seats_cafe_idx on public.cafe_seats(cafe_id);
-- 一個使用者同時只能坐一個位子
create unique index if not exists one_seat_per_user
  on public.cafe_seats(occupant_id) where occupant_id is not null;

-- ---------- 4. heartbeat（獨立資料表，不加入 Realtime，避免每 25 秒廣播一次） ----------
create table if not exists public.seat_heartbeats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  beat_at timestamptz not null default now()
);

-- ---------- 5. 新使用者自動建立 profile ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1), '同學'), 24)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 6. RLS：只開放 SELECT，寫入一律走 RPC ----------
alter table public.profiles        enable row level security;
alter table public.cafes           enable row level security;
alter table public.cafe_seats      enable row level security;
alter table public.seat_heartbeats enable row level security;  -- 不建 policy = 前端完全不能碰

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "cafes readable" on public.cafes;
create policy "cafes readable" on public.cafes for select to authenticated using (true);

drop policy if exists "seats readable" on public.cafe_seats;
create policy "seats readable" on public.cafe_seats for select to authenticated using (true);

-- ---------- 7. RPC ----------
-- 搶座：原子操作；已在別處入座會自動換位；同一個座位重複呼叫 = 刷新 profile 快照（換頭像用）
create or replace function public.claim_seat(p_seat_id uuid) returns public.cafe_seats
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
  v_row     public.cafe_seats;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found then raise exception 'profile_missing'; end if;

  -- 先釋放舊座位
  update public.cafe_seats set
    occupant_id = null, occupant_name = null, occupant_avatar_url = null,
    status = 'empty', task = null, phase_started_at = null, phase_ends_at = null, updated_at = now()
  where occupant_id = v_uid and id <> p_seat_id;

  -- 原子搶座：兩人同時搶，後到者的 WHERE 會在鎖釋放後重新判斷而落空
  update public.cafe_seats set
    occupant_name       = v_profile.display_name,
    occupant_avatar_url = v_profile.avatar_url,
    status           = case when occupant_id = v_uid then status           else 'break' end,
    task             = case when occupant_id = v_uid then task             else null    end,
    phase_started_at = case when occupant_id = v_uid then phase_started_at else null    end,
    phase_ends_at    = case when occupant_id = v_uid then phase_ends_at    else null    end,
    occupant_id = v_uid,
    updated_at  = now()
  where id = p_seat_id and (occupant_id is null or occupant_id = v_uid)
  returning * into v_row;

  if not found then raise exception 'seat_taken'; end if;

  insert into public.seat_heartbeats(user_id, beat_at) values (v_uid, now())
  on conflict (user_id) do update set beat_at = now();
  return v_row;
end $$;

-- 離座
create or replace function public.release_my_seat() returns void
language sql security definer set search_path = public as $$
  update public.cafe_seats set
    occupant_id = null, occupant_name = null, occupant_avatar_url = null,
    status = 'empty', task = null, phase_started_at = null, phase_ends_at = null, updated_at = now()
  where occupant_id = auth.uid();
$$;

-- 切換讀書 / 休息（同時設定任務與倒數秒數）
create or replace function public.set_seat_state(p_status text, p_task text, p_duration_sec int)
returns public.cafe_seats
language plpgsql security definer set search_path = public as $$
declare v_row public.cafe_seats;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_status not in ('studying','break') then raise exception 'invalid_status'; end if;

  update public.cafe_seats set
    status = p_status,
    task = nullif(left(btrim(coalesce(p_task,'')), 40), ''),
    phase_started_at = now(),
    phase_ends_at = case when p_duration_sec is null then null
                         else now() + make_interval(secs => least(greatest(p_duration_sec, 60), 7200)) end,
    updated_at = now()
  where occupant_id = auth.uid()
  returning * into v_row;

  if not found then raise exception 'no_seat'; end if;
  return v_row;
end $$;

-- 心跳
create or replace function public.heartbeat() returns void
language sql security definer set search_path = public as $$
  insert into public.seat_heartbeats(user_id, beat_at) values (auth.uid(), now())
  on conflict (user_id) do update set beat_at = now();
$$;

-- 清理幽靈座位（只給排程用，不開放給前端）
create or replace function public.release_stale_seats(p_seconds int default 90) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update public.cafe_seats s set
    occupant_id = null, occupant_name = null, occupant_avatar_url = null,
    status = 'empty', task = null, phase_started_at = null, phase_ends_at = null, updated_at = now()
  where s.occupant_id is not null
    and not exists (
      select 1 from public.seat_heartbeats h
      where h.user_id = s.occupant_id
        and h.beat_at > now() - make_interval(secs => p_seconds)
    );
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.claim_seat(uuid)                from public, anon;
revoke execute on function public.release_my_seat()               from public, anon;
revoke execute on function public.set_seat_state(text,text,int)   from public, anon;
revoke execute on function public.heartbeat()                     from public, anon;
revoke execute on function public.release_stale_seats(int)        from public, anon, authenticated;
grant  execute on function public.claim_seat(uuid)                to authenticated;
grant  execute on function public.release_my_seat()               to authenticated;
grant  execute on function public.set_seat_state(text,text,int)   to authenticated;
grant  execute on function public.heartbeat()                     to authenticated;

-- ---------- 8. Realtime ----------
alter publication supabase_realtime add table public.cafe_seats;  -- 若回報已存在可忽略

-- ---------- 9. 兜底排程（若報錯，先到 Dashboard → Database → Extensions 啟用 pg_cron） ----------
-- 瀏覽器背景分頁會節流計時器，所以門檻抓 90 秒（心跳 25 秒一次）
create extension if not exists pg_cron;
select cron.schedule('release-stale-seats', '* * * * *', $$select public.release_stale_seats(90);$$);

-- ---------- 10. 範例資料：1 間咖啡廳、12 個座位 ----------
-- A 排(z=-2.2) 與 B 排(z=0.2) 面對面併桌；C 排(z=3.4) 與 D 排(z=5.8) 面對面併桌
-- rot_y：0 = 面向 +Z，3.14159 = 面向 -Z
with c as (
  insert into public.cafes (slug, name, description)
  values ('main-street', '街角自習咖啡廳', '暖暖的木質調，一起安靜讀書')
  on conflict (slug) do update set name = excluded.name, description = excluded.description
  returning id
)
insert into public.cafe_seats (cafe_id, seat_index, pos_x, pos_y, pos_z, rot_y)
select c.id, s.i, s.x, 0.45, s.z, s.r
from c, (values
  (0, -3.6, -2.2, 0.0),     (1, -1.2, -2.2, 0.0),     (2, 1.2, -2.2, 0.0),     (3, 3.6, -2.2, 0.0),
  (4, -3.6,  0.2, 3.14159), (5, -1.2,  0.2, 3.14159), (6, 1.2,  0.2, 3.14159), (7, 3.6,  0.2, 3.14159),
  (8, -1.2,  3.4, 0.0),     (9,  1.2,  3.4, 0.0),
  (10, -1.2, 5.8, 3.14159), (11, 1.2,  5.8, 3.14159)
) as s(i, x, z, r)
-- 已有舊座位（舊版 6 個）時：只更新座標，不動佔用者狀態
on conflict (cafe_id, seat_index) do update
  set pos_x = excluded.pos_x, pos_y = excluded.pos_y, pos_z = excluded.pos_z, rot_y = excluded.rot_y;
