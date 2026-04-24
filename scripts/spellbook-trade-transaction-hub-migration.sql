-- Spellbook: transaction hub fields on trade_offer_messages + RLS + Realtime notes
-- Run in Supabase SQL editor (or psql) against your Spellbook project.

BEGIN;

ALTER TABLE trade_offer_messages
  ADD COLUMN IF NOT EXISTS message_kind text NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS shipment_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN trade_offer_messages.message_kind IS
  'chat | shipment_update | proof (and optional question treated as chat in UI)';
COMMENT ON COLUMN trade_offer_messages.shipment_meta IS
  'JSON e.g. {"tracking":"UPS 1Z…"} for shipment updates';

CREATE INDEX IF NOT EXISTS idx_trade_offer_messages_offer_created
  ON trade_offer_messages (offer_id, created_at DESC);

COMMIT;

-- ---------------------------------------------------------------------------
-- Row level security (adjust if you already have policies on this table)
-- ---------------------------------------------------------------------------
-- ALTER TABLE trade_offer_messages ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY trade_offer_messages_select ON trade_offer_messages
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1
--       FROM trade_offers o
--       JOIN trade_listings l ON l.id = o.listing_id
--       WHERE o.id = trade_offer_messages.offer_id
--         AND o.status IN ('accepted', 'awaiting_confirmation', 'completed')
--         AND (o.proposer_id = (SELECT auth.uid()) OR l.seller_id = (SELECT auth.uid()))
--     )
--   );
--
-- CREATE POLICY trade_offer_messages_insert ON trade_offer_messages
--   FOR INSERT WITH CHECK (
--     sender_id = (SELECT auth.uid())
--     AND EXISTS (
--       SELECT 1
--       FROM trade_offers o
--       JOIN trade_listings l ON l.id = o.listing_id
--       WHERE o.id = trade_offer_messages.offer_id
--         AND o.status IN ('accepted', 'awaiting_confirmation', 'completed', 'pending')
--         AND (o.proposer_id = (SELECT auth.uid()) OR l.seller_id = (SELECT auth.uid()))
--     )
--   );
-- Note: include "pending" in INSERT if you want negotiation-only inbox replies
-- without a separate policy; tighten to agreed-only if desired.

-- ---------------------------------------------------------------------------
-- Supabase Realtime: expose inserts to subscribed clients
-- ---------------------------------------------------------------------------
-- Dashboard → Database → Publications → supabase_realtime → add table
--   trade_offer_messages
-- Or SQL (superuser / dashboard):
--   ALTER PUBLICATION supabase_realtime ADD TABLE trade_offer_messages;

-- ---------------------------------------------------------------------------
-- Hard retention (optional): delete rows older than 60 days (e.g. weekly cron)
-- ---------------------------------------------------------------------------
-- DELETE FROM trade_offer_messages WHERE created_at < now() - interval '60 days';
