-- ============================================================
-- focus_log_fix.sql — 修正「專注時間結束沒有被記錄」＋提前結束功能
-- 可重複執行。前提：已執行過 schema.sql、cafes_calendar_24_seats.sql（需要 focus_logs / cafe_seats）。
--
-- 問題：以前只靠瀏覽器的 setTimeout 在「時間到」那一刻寫入。分頁在背景、手機鎖屏、
--       心跳中斷被 cron 當幽靈座位釋放時，計時器一起消失 → 完全沒有紀錄。
-- 修法：改由資料庫保證記錄，前端只負責即時回饋。
--   1. cafe_seats 的 trigger：專注階段「已經跑完」之後，只要座位被離開 / 換狀態 / 換人，就補寫一筆。
--   2. pg_cron 每分鐘掃描：已跑完卻還坐在位子上的，也補寫（不改座位）。
--   3. release_stale_seats：專注倒數還沒跑完時，不因心跳中斷而踢人（跑完 + 90 秒才清）。
--   4. claim_seat：可以接手「沒有心跳」的座位（避免看起來是空位卻搶不到）。
--   5. RPC log_my_finished_focus：前端時間到時呼叫（有重試）。
--   6. RPC end_focus_early：提前結束，依實際專注分鐘數記錄。
-- ============================================================

-- ---------- 1. 共用：寫入一筆專注紀錄 ----------
-- 回傳：>0 = 這次新寫入的分鐘數；0 = 已經有紀錄（重複）；null = 無效或失敗（不丟錯，避免影響座位更新）
create or replace function public._insert_focus_log(
  p_user uuid, p_cafe uuid, p_task text, p_started timestamptz, p_ends timestamptz
) returns int
language plpgsql security definer set search_path = public as $$
declare v_min int;
begin
  if p_user is null or p_started is null or p_ends is null then return null; end if;
  v_min := round(extract(epoch from (p_ends - p_started)) / 60.0)::int;
  if v_min < 1 then return null; end if;
  v_min := least(v_min, 240);

  -- 同一個階段（started_at 差 1 秒內）視為重複，避免前端 / trigger / cron 重複寫入
  if exists (
    select 1 from public.focus_logs
    where user_id = p_user
      and started_at between p_started - interval '1 second' and p_started + interval '1 second'
  ) then
    return 0;
  end if;

  insert into public.focus_logs (user_id, cafe_id, task, minutes, started_at)
  values (p_user, p_cafe, nullif(left(btrim(coalesce(p_task, '')), 40), ''), v_min, p_started)
  on conflict (user_id, started_at) do nothing;
  return v_min;
exception when others then
  raise warning '[focus_log] 寫入失敗：%', sqlerrm;
  return null;
end $$;

-- ---------- 2. Trigger：專注階段跑完後，座位一被離開 / 換狀態就補記 ----------
create or replace function public._cafe_seats_log_focus() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'studying'
     and old.occupant_id is not null
     and old.phase_started_at is not null
     and old.phase_ends_at is not null
     and old.phase_ends_at <= now() + interval '5 seconds'   -- 容許前後端時鐘小誤差
     and (   new.occupant_id      is distinct from old.occupant_id
          or new.status           is distinct from old.status
          or new.phase_started_at is distinct from old.phase_started_at)
  then
    perform public._insert_focus_log(old.occupant_id, old.cafe_id, old.task, old.phase_started_at, old.phase_ends_at);
  end if;
  return new;
end $$;

drop trigger if exists cafe_seats_log_focus on public.cafe_seats;
create trigger cafe_seats_log_focus
  before update on public.cafe_seats
  for each row execute function public._cafe_seats_log_focus();

-- ---------- 3. 掃描：已跑完但人還坐著（沒按任何東西、也沒關頁面）的專注階段 ----------
create or replace function public.log_finished_focus_sweep() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select occupant_id, cafe_id, task, phase_started_at, phase_ends_at
    from public.cafe_seats
    where status = 'studying' and occupant_id is not null
      and phase_started_at is not null and phase_ends_at is not null
      and phase_ends_at <= now()
  loop
    if coalesce(public._insert_focus_log(r.occupant_id, r.cafe_id, r.task, r.phase_started_at, r.phase_ends_at), 0) > 0 then
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------- 4. 專注倒數還沒跑完時，不因心跳中斷踢人 ----------
-- 分頁在背景 / 手機鎖屏時，瀏覽器會暫停心跳。專注中的座位保留到「倒數結束 + p_seconds」才清。
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
    )
    and not (
      s.status = 'studying' and s.phase_ends_at is not null
      and s.phase_ends_at + make_interval(secs => p_seconds) > now()
    );
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------- 5. 搶座：可以接手「沒有心跳」的座位 ----------
-- （因為專注中的座位會多保留一段時間，畫面上看起來是空位但資料庫還有人，不能讓別人搶不到）
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

  -- 原子搶座：空位、自己的座位、或佔用者已超過 90 秒沒有心跳
  update public.cafe_seats set
    occupant_name       = v_profile.display_name,
    occupant_avatar_url = v_profile.avatar_url,
    status           = case when occupant_id = v_uid then status           else 'break' end,
    task             = case when occupant_id = v_uid then task             else null    end,
    phase_started_at = case when occupant_id = v_uid then phase_started_at else null    end,
    phase_ends_at    = case when occupant_id = v_uid then phase_ends_at    else null    end,
    occupant_id = v_uid,
    updated_at  = now()
  where id = p_seat_id
    and (
      occupant_id is null
      or occupant_id = v_uid
      or not exists (
        select 1 from public.seat_heartbeats h
        where h.user_id = cafe_seats.occupant_id and h.beat_at > now() - interval '90 seconds'
      )
    )
  returning * into v_row;

  if not found then raise exception 'seat_taken'; end if;

  insert into public.seat_heartbeats(user_id, beat_at) values (v_uid, now())
  on conflict (user_id) do update set beat_at = now();
  return v_row;
end $$;

-- ---------- 6. RPC：前端「時間到」時呼叫，確認這一輪已記錄 ----------
-- result：logged（剛寫入）/ already（先前已記錄）/ not_finished（時間還沒到）/ no_seat / not_studying / error
create or replace function public.log_my_finished_focus() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s     public.cafe_seats;
  v_min int;
  v_out int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into s from public.cafe_seats where occupant_id = v_uid;
  if not found then return jsonb_build_object('result', 'no_seat'); end if;
  if s.status <> 'studying' or s.phase_started_at is null or s.phase_ends_at is null then
    return jsonb_build_object('result', 'not_studying');
  end if;
  if s.phase_ends_at > now() + interval '5 seconds' then
    return jsonb_build_object('result', 'not_finished',
      'seconds_left', ceil(extract(epoch from (s.phase_ends_at - now())))::int);
  end if;

  v_min := least(240, round(extract(epoch from (s.phase_ends_at - s.phase_started_at)) / 60.0)::int);
  v_out := public._insert_focus_log(v_uid, s.cafe_id, s.task, s.phase_started_at, s.phase_ends_at);
  return jsonb_build_object(
    'result',  case when v_out is null then 'error' when v_out = 0 then 'already' else 'logged' end,
    'minutes', v_min, 'task', s.task, 'started_at', s.phase_started_at);
end $$;

-- ---------- 7. RPC：提前結束專注，依「實際專注分鐘數」記錄，座位改成休息 ----------
-- result：logged / already / too_short（不到 1 分鐘，不記錄）；full = 其實已經跑完
create or replace function public.end_focus_early() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  s      public.cafe_seats;
  v_row  public.cafe_seats;
  v_full boolean;
  v_min  int;
  v_out  int;
  v_res  text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into s from public.cafe_seats where occupant_id = v_uid for update;
  if not found then raise exception 'no_seat'; end if;
  if s.status <> 'studying' or s.phase_started_at is null then raise exception 'not_studying'; end if;

  v_full := s.phase_ends_at is not null and s.phase_ends_at <= now() + interval '5 seconds';
  if v_full then
    v_min := least(240, round(extract(epoch from (s.phase_ends_at - s.phase_started_at)) / 60.0)::int);
    v_out := public._insert_focus_log(v_uid, s.cafe_id, s.task, s.phase_started_at, s.phase_ends_at);
  else
    v_min := least(240, floor(extract(epoch from (now() - s.phase_started_at)) / 60.0)::int);
    if v_min >= 1 then
      v_out := public._insert_focus_log(v_uid, s.cafe_id, s.task, s.phase_started_at,
                                        s.phase_started_at + make_interval(mins => v_min));
    end if;
  end if;

  v_res := case when v_min < 1 then 'too_short' when v_out is null then 'error'
                when v_out = 0 then 'already' else 'logged' end;

  update public.cafe_seats set
    status = 'break', task = null, phase_started_at = now(), phase_ends_at = null, updated_at = now()
  where id = s.id
  returning * into v_row;

  return jsonb_build_object('result', v_res, 'minutes', greatest(v_min, 0), 'full', v_full, 'seat', to_jsonb(v_row));
end $$;

-- ---------- 8. 權限 ----------
revoke execute on function public._insert_focus_log(uuid, uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public._cafe_seats_log_focus()      from public, anon, authenticated;
revoke execute on function public.log_finished_focus_sweep()   from public, anon, authenticated;
revoke execute on function public.log_my_finished_focus()      from public, anon;
revoke execute on function public.end_focus_early()            from public, anon;
grant  execute on function public.log_my_finished_focus()      to authenticated;
grant  execute on function public.end_focus_early()            to authenticated;

-- ---------- 9. 排程：每分鐘補記「已跑完」的專注（若報錯，先到 Dashboard → Database → Extensions 啟用 pg_cron 再重跑） ----------
do $$
begin
  perform cron.schedule('log-finished-focus', '* * * * *', 'select public.log_finished_focus_sweep();');
exception when others then
  raise notice 'pg_cron 尚未啟用，已略過每分鐘補記排程（trigger 與前端記錄仍然有效）：%', sqlerrm;
end $$;

-- ---------- （選用）防止使用者自己亂寫專注分鐘數 ----------
-- 現在所有紀錄都由上面的函式產生，前端不需要直接 insert。確認前端已更新到新版後，可以取消下面註解，
-- 排行榜就不會被人用 API 灌分：
-- drop policy if exists "own logs insert" on public.focus_logs;
