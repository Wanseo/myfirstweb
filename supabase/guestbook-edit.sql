-- Add secure editing to the existing guestbook. Run once in SQL Editor.
-- Original entries are preserved; only newly issued private keys permit editing.
begin;
create table if not exists public.guestbook_edit_keys (
  entry_id uuid primary key references public.guestbook_entries(id) on delete cascade,
  token_hash bytea not null
);
alter table public.guestbook_edit_keys enable row level security;
revoke all on public.guestbook_edit_keys from public, anon, authenticated;

create or replace function public.create_guestbook_entry(
  p_name text, p_message text, p_edit_token text
) returns public.guestbook_entries
language plpgsql security definer set search_path = '' as $$
declare
  result public.guestbook_entries;
begin
  if p_edit_token is null or p_edit_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid edit key' using errcode = '22023';
  end if;
  insert into public.guestbook_entries(name, message)
    values (pg_catalog.btrim(p_name), pg_catalog.btrim(p_message)) returning * into result;
  insert into public.guestbook_edit_keys(entry_id, token_hash)
    values (result.id, pg_catalog.sha256(pg_catalog.convert_to(p_edit_token, 'UTF8')));
  return result;
end;
$$;

create or replace function public.edit_guestbook_entry(
  p_entry_id uuid, p_name text, p_message text, p_edit_token text
) returns public.guestbook_entries
language plpgsql security definer set search_path = '' as $$
declare
  result public.guestbook_entries;
begin
  if p_edit_token is null or p_edit_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid edit key' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.guestbook_edit_keys
    where entry_id = p_entry_id
      and token_hash = pg_catalog.sha256(pg_catalog.convert_to(p_edit_token, 'UTF8'))
  ) then
    raise exception 'Only the author can edit this entry' using errcode = '42501';
  end if;
  update public.guestbook_entries
    set name = pg_catalog.btrim(p_name), message = pg_catalog.btrim(p_message)
    where id = p_entry_id returning * into result;
  if not found then
    raise exception 'Entry not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;
revoke all on function public.create_guestbook_entry(text, text, text) from public;
revoke all on function public.edit_guestbook_entry(uuid, text, text, text) from public;
grant execute on function public.create_guestbook_entry(text, text, text) to anon, authenticated;
grant execute on function public.edit_guestbook_entry(uuid, text, text, text) to anon, authenticated;
-- Keep direct update forbidden: clients must use the key-checking function.
revoke update on public.guestbook_entries from anon, authenticated;
commit;
