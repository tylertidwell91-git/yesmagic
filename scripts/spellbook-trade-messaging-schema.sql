-- Spellbook — trade inbox + in-app notifications + message threads
-- Run in Supabase SQL Editor AFTER scripts/spellbook-trading-schema.sql

-- ---------------------------------------------------------------------------
-- Messages on an offer (seller ↔ proposer)
-- ---------------------------------------------------------------------------
create table if not exists public.trade_offer_messages (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.trade_offers (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null
    check (char_length(trim(body)) > 0 and char_length(body) <= 8000),
  created_at timestamptz not null default now()
);

create index if not exists trade_offer_messages_offer_created_idx
  on public.trade_offer_messages (offer_id, created_at asc);

alter table public.trade_offer_messages enable row level security;

drop policy if exists "trade_offer_messages_select_party" on public.trade_offer_messages;
create policy "trade_offer_messages_select_party"
  on public.trade_offer_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.trade_offers o
      join public.trade_listings l on l.id = o.listing_id
      where o.id = offer_id
        and (o.proposer_id = auth.uid() or l.seller_id = auth.uid())
    )
  );

drop policy if exists "trade_offer_messages_insert_party" on public.trade_offer_messages;
create policy "trade_offer_messages_insert_party"
  on public.trade_offer_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.trade_offers o
      join public.trade_listings l on l.id = o.listing_id
      where o.id = offer_id
        and (o.proposer_id = auth.uid() or l.seller_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- In-app notifications (rows inserted only via triggers below)
-- ---------------------------------------------------------------------------
create table if not exists public.trade_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_id uuid not null references public.trade_offers (id) on delete cascade,
  kind text not null
    check (kind in ('offer_received', 'message_received')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trade_notifications_user_unread_idx
  on public.trade_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.trade_notifications enable row level security;

drop policy if exists "trade_notifications_select_own" on public.trade_notifications;
create policy "trade_notifications_select_own"
  on public.trade_notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "trade_notifications_update_own" on public.trade_notifications;
create policy "trade_notifications_update_own"
  on public.trade_notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Triggers: notify seller on new offer; notify counterparty on new message
-- ---------------------------------------------------------------------------
create or replace function public.trade_offer_notify_seller()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seller uuid;
begin
  select seller_id into seller from public.trade_listings where id = new.listing_id;
  if seller is not null and seller <> new.proposer_id then
    insert into public.trade_notifications (user_id, offer_id, kind)
    values (seller, new.id, 'offer_received');
  end if;
  return new;
end;
$$;

drop trigger if exists tr_trade_offer_notify_seller on public.trade_offers;
create trigger tr_trade_offer_notify_seller
  after insert on public.trade_offers
  for each row
  execute function public.trade_offer_notify_seller();

create or replace function public.trade_offer_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seller uuid;
  proposer uuid;
  recipient uuid;
begin
  update public.trade_offers
  set updated_at = now()
  where id = new.offer_id;

  select l.seller_id, o.proposer_id
  into seller, proposer
  from public.trade_offers o
  join public.trade_listings l on l.id = o.listing_id
  where o.id = new.offer_id;

  if seller is null then
    return new;
  end if;

  if new.sender_id = proposer then
    recipient := seller;
  else
    recipient := proposer;
  end if;

  if recipient is not null and recipient <> new.sender_id then
    insert into public.trade_notifications (user_id, offer_id, kind)
    values (recipient, new.offer_id, 'message_received');
  end if;

  return new;
end;
$$;

drop trigger if exists tr_trade_offer_message_after_insert on public.trade_offer_messages;
create trigger tr_trade_offer_message_after_insert
  after insert on public.trade_offer_messages
  for each row
  execute function public.trade_offer_message_after_insert();
