-- Spellbook usernames: unique + immutable public handle per account
-- Run in Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.spellbook_usernames (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spellbook_usernames_username_format_chk
    CHECK (username ~ '^[a-z0-9_]{3,24}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS spellbook_usernames_username_lower_uq
  ON public.spellbook_usernames ((lower(username)));

ALTER TABLE public.spellbook_usernames ENABLE ROW LEVEL SECURITY;

-- Everyone can check availability / resolve labels.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'spellbook_usernames'
      AND policyname = 'spellbook_usernames_select_public'
  ) THEN
    CREATE POLICY spellbook_usernames_select_public
      ON public.spellbook_usernames
      FOR SELECT
      USING (true);
  END IF;
END$$;

-- Authenticated user can only insert their own immutable row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'spellbook_usernames'
      AND policyname = 'spellbook_usernames_insert_own'
  ) THEN
    CREATE POLICY spellbook_usernames_insert_own
      ON public.spellbook_usernames
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = (select auth.uid())
        AND username = lower(username)
      );
  END IF;
END$$;

-- No UPDATE policy on purpose: username cannot be changed.
-- No DELETE policy on purpose: username cannot be removed by clients.

COMMIT;
