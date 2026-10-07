-- Run in the Supabase SQL Editor. Safe to rerun for this guestbook table.
create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists guestbook_entries_created_at_idx
  on public.guestbook_entries (created_at desc, id desc);
alter table public.guestbook_entries enable row level security;
revoke all on public.guestbook_entries from anon, authenticated;
grant select on public.guestbook_entries to anon, authenticated;
grant insert (name, message) on public.guestbook_entries to anon, authenticated;
drop policy if exists "Anyone can read guestbook" on public.guestbook_entries;
create policy "Anyone can read guestbook" on public.guestbook_entries
  for select to anon, authenticated using (true);
drop policy if exists "Anyone can write guestbook" on public.guestbook_entries;
create policy "Anyone can write guestbook" on public.guestbook_entries
  for insert to anon, authenticated with check (
    char_length(btrim(name)) between 1 and 30
    and char_length(btrim(message)) between 1 and 500
  );
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guestbook_entries'
  ) then
    alter publication supabase_realtime add table public.guestbook_entries;
  end if;
end $$;
