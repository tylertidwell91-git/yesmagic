-- Spellbook — Community Trading Hub (run in Supabase SQL Editor after spellbook-supabase-schema.sql)

create table if not exists public.trade_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  card jsonb not null,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists trade_listings_active_created_idx
  on public.trade_listings (active, created_at desc);
create index if not exists trade_listings_seller_idx
  on public.trade_listings (seller_id);

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.trade_listings (id) on delete cascade,
  proposer_id uuid not null references auth.users (id) on delete cascade,
  offer_cards jsonb not null default '[]'::jsonb,
  mode text not null check (mode in ('peer', 'mediated')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'awaiting_confirmation', 'completed')),
  trading_fee_cents int not null default 99,
  oversight_fee_cents int not null default 0,
  seller_confirmed boolean not null default false,
  proposer_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trade_offers_listing_idx on public.trade_offers (listing_id);
create index if not exists trade_offers_proposer_idx on public.trade_offers (proposer_id);

alter table public.trade_listings enable row level security;
alter table public.trade_offers enable row level security;

-- Listings: anyone signed in can browse active listings; sellers manage their rows
-- (drop + create so the script is safe to re-run)
drop policy if exists "trade_listings_select_authed" on public.trade_listings;
create policy "trade_listings_select_authed"
  on public.trade_listings for select
  to authenticated
  using (true);

drop policy if exists "trade_listings_insert_own" on public.trade_listings;
create policy "trade_listings_insert_own"
  on public.trade_listings for insert
  to authenticated
  with check (seller_id = auth.uid());

drop policy if exists "trade_listings_update_own" on public.trade_listings;
create policy "trade_listings_update_own"
  on public.trade_listings for update
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "trade_listings_delete_own" on public.trade_listings;
create policy "trade_listings_delete_own"
  on public.trade_listings for delete
  to authenticated
  using (seller_id = auth.uid());

-- Offers: proposer and listing owner can see; proposer inserts; both can update within rules
drop policy if exists "trade_offers_select_parties" on public.trade_offers;
create policy "trade_offers_select_parties"
  on public.trade_offers for select
  to authenticated
  using (
    proposer_id = auth.uid()
    or exists (
      select 1 from public.trade_listings L
      where L.id = listing_id and L.seller_id = auth.uid()
    )
  );

drop policy if exists "trade_offers_insert_proposer" on public.trade_offers;
create policy "trade_offers_insert_proposer"
  on public.trade_offers for insert
  to authenticated
  with check (
    proposer_id = auth.uid()
    and exists (
      select 1 from public.trade_listings L
      where L.id = listing_id and L.seller_id <> auth.uid() and L.active = true
    )
  );

drop policy if exists "trade_offers_update_parties" on public.trade_offers;
create policy "trade_offers_update_parties"
  on public.trade_offers for update
  to authenticated
  using (
    proposer_id = auth.uid()
    or exists (
      select 1 from public.trade_listings L
      where L.id = listing_id and L.seller_id = auth.uid()
    )
  )
  with check (
    proposer_id = auth.uid()
    or exists (
      select 1 from public.trade_listings L
      where L.id = listing_id and L.seller_id = auth.uid()
    )
  );
