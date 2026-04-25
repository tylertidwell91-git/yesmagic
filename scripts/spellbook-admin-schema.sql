-- Spellbook admin controls + presence + admin transaction-hub access
-- Run in Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.spellbook_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spellbook_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  online boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spellbook_presence_online_last_seen
  ON public.spellbook_presence (online, last_seen DESC);

ALTER TABLE public.spellbook_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spellbook_presence ENABLE ROW LEVEL SECURITY;

-- Admin table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='spellbook_admins' AND policyname='spellbook_admins_select_public'
  ) THEN
    CREATE POLICY spellbook_admins_select_public
      ON public.spellbook_admins
      FOR SELECT
      USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='spellbook_admins' AND policyname='spellbook_admins_insert_admin_only'
  ) THEN
    CREATE POLICY spellbook_admins_insert_admin_only
      ON public.spellbook_admins
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.spellbook_admins a WHERE a.user_id = (select auth.uid())
        )
      );
  END IF;
END$$;

-- Presence policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='spellbook_presence' AND policyname='spellbook_presence_select_admin_only'
  ) THEN
    CREATE POLICY spellbook_presence_select_admin_only
      ON public.spellbook_presence
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.spellbook_admins a WHERE a.user_id = (select auth.uid())
        )
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='spellbook_presence' AND policyname='spellbook_presence_upsert_own'
  ) THEN
    CREATE POLICY spellbook_presence_upsert_own
      ON public.spellbook_presence
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='spellbook_presence' AND policyname='spellbook_presence_update_own'
  ) THEN
    CREATE POLICY spellbook_presence_update_own
      ON public.spellbook_presence
      FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END$$;

-- Admins can read all trade offers/listings/messages and post messages in any offer.
DO $$
BEGIN
  IF to_regclass('public.trade_offers') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='trade_offers' AND policyname='trade_offers_admin_select_all'
    ) THEN
      CREATE POLICY trade_offers_admin_select_all
        ON public.trade_offers
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.spellbook_admins a WHERE a.user_id = (select auth.uid())
          )
        );
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.trade_listings') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='trade_listings' AND policyname='trade_listings_admin_select_all'
    ) THEN
      CREATE POLICY trade_listings_admin_select_all
        ON public.trade_listings
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.spellbook_admins a WHERE a.user_id = (select auth.uid())
          )
        );
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.trade_offer_messages') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='trade_offer_messages' AND policyname='trade_offer_messages_admin_select_all'
    ) THEN
      CREATE POLICY trade_offer_messages_admin_select_all
        ON public.trade_offer_messages
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.spellbook_admins a WHERE a.user_id = (select auth.uid())
          )
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='trade_offer_messages' AND policyname='trade_offer_messages_admin_insert_any_offer'
    ) THEN
      CREATE POLICY trade_offer_messages_admin_insert_any_offer
        ON public.trade_offer_messages
        FOR INSERT
        TO authenticated
        WITH CHECK (
          sender_id = (select auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.spellbook_admins a WHERE a.user_id = (select auth.uid())
          )
          AND EXISTS (
            SELECT 1 FROM public.trade_offers o WHERE o.id = trade_offer_messages.offer_id
          )
        );
    END IF;
  END IF;
END$$;

COMMIT;

-- Bootstrap first admin manually (run once as SQL editor user):
-- INSERT INTO public.spellbook_admins (user_id, granted_by)
-- VALUES ('<YOUR_AUTH_USER_UUID>', '<YOUR_AUTH_USER_UUID>')
-- ON CONFLICT (user_id) DO NOTHING;
