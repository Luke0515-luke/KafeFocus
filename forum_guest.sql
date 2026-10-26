-- =====================================================================
-- KafeFocus：訪客可瀏覽 + 讀書論壇
-- 貼到 Supabase Dashboard → SQL Editor 執行一次即可（可重複執行）。
-- 前提：已執行過 schema.sql（profiles / cafes / cafe_seats）。
-- 另外請把更新後的 study_planner.sql 也重新執行一次（咖啡豆直升、排行榜開放訪客）。
-- =====================================================================

-- 1. 訪客（anon）可以「讀」咖啡廳與座位（入座 / 聊天 / 寫入仍然必須登入）
drop policy if exists "cafes readable anon" on public.cafes;
create policy "cafes readable anon" on public.cafes for select to anon using (true);
drop policy if exists "seats readable anon" on public.cafe_seats;
create policy "seats readable anon" on public.cafe_seats for select to anon using (true);

-- 2. 論壇文章
create table if not exists public.forum_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '同學',
  title       text not null check (char_length(title) between 2 and 80),
  body        text not null check (char_length(body)  between 10 and 4000),
  category    text not null default 'other'
              check (category in ('pomodoro','active-recall','spaced','feynman','notes','language','exam','other')),
  subject     text check (subject is null or char_length(subject) <= 30),
  created_at  timestamptz not null default now()
);
create index if not exists forum_posts_created_idx on public.forum_posts(created_at desc);

-- 3. 留言
create table if not exists public.forum_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.forum_posts(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '同學',
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists forum_comments_post_idx on public.forum_comments(post_id, created_at);

-- 4. 按讚（一人一篇一個讚）
create table if not exists public.forum_likes (
  post_id    uuid not null references public.forum_posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 5. 作者名稱一律由伺服器從 profiles 帶入（前端無法冒名）
create or replace function public.forum_set_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  select display_name into new.author_name from public.profiles where id = new.user_id;
  new.author_name := coalesce(new.author_name, '同學');
  return new;
end $$;

drop trigger if exists forum_posts_author on public.forum_posts;
create trigger forum_posts_author before insert on public.forum_posts
  for each row execute function public.forum_set_author();
drop trigger if exists forum_comments_author on public.forum_comments;
create trigger forum_comments_author before insert on public.forum_comments
  for each row execute function public.forum_set_author();

-- 6. RLS：任何人（含訪客）可讀；只有登入者能寫，且只能寫 / 刪自己的
alter table public.forum_posts    enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_likes    enable row level security;

drop policy if exists "forum posts read" on public.forum_posts;
create policy "forum posts read" on public.forum_posts for select to anon, authenticated using (true);
drop policy if exists "forum posts insert" on public.forum_posts;
create policy "forum posts insert" on public.forum_posts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "forum posts delete" on public.forum_posts;
create policy "forum posts delete" on public.forum_posts for delete to authenticated using (user_id = auth.uid());

drop policy if exists "forum comments read" on public.forum_comments;
create policy "forum comments read" on public.forum_comments for select to anon, authenticated using (true);
drop policy if exists "forum comments insert" on public.forum_comments;
create policy "forum comments insert" on public.forum_comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "forum comments delete" on public.forum_comments;
create policy "forum comments delete" on public.forum_comments for delete to authenticated using (user_id = auth.uid());

drop policy if exists "forum likes read" on public.forum_likes;
create policy "forum likes read" on public.forum_likes for select to anon, authenticated using (true);
drop policy if exists "forum likes insert" on public.forum_likes;
create policy "forum likes insert" on public.forum_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "forum likes delete" on public.forum_likes;
create policy "forum likes delete" on public.forum_likes for delete to authenticated using (user_id = auth.uid());
