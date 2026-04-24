-- Run in Supabase → SQL Editor (once per project).
-- Then enable Email provider under Authentication → Providers.

create table if not exists public.spellbook_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists spellbook_data_updated_at_idx on public.spellbook_data (updated_at desc);

alter table public.spellbook_data enable row level security;

create policy "spellbook_select_own"
  on public.spellbook_data for select
  using (auth.uid() = user_id);

create policy "spellbook_insert_own"
  on public.spellbook_data for insert
  with check (auth.uid() = user_id);

create policy "spellbook_update_own"
  on public.spellbook_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "spellbook_delete_own"
  on public.spellbook_data for delete
  using (auth.uid() = user_id);
