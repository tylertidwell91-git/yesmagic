-- Spellbook usernames: unique + immutable public handle per account
-- Run in Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.spellbook_usernames (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  login_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spellbook_usernames_username_format_chk
    CHECK (username ~ '^[a-z0-9_]{3,24}$')
);

ALTER TABLE public.spellbook_usernames
  ADD COLUMN IF NOT EXISTS login_email text;

UPDATE public.spellbook_usernames su
SET login_email = lower(u.email)
FROM auth.users u
WHERE su.user_id = u.id
  AND (su.login_email IS NULL OR su.login_email = '');

ALTER TABLE public.spellbook_usernames
  ALTER COLUMN login_email SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spellbook_usernames_login_email_chk'
      AND conrelid = 'public.spellbook_usernames'::regclass
  ) THEN
    ALTER TABLE public.spellbook_usernames
      ADD CONSTRAINT spellbook_usernames_login_email_chk
      CHECK (position('@' in login_email) > 1);
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS spellbook_usernames_username_lower_uq
  ON public.spellbook_usernames ((lower(username)));

CREATE UNIQUE INDEX IF NOT EXISTS spellbook_usernames_login_email_lower_uq
  ON public.spellbook_usernames ((lower(login_email)));

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
        AND login_email = lower(login_email)
      );
  END IF;
END$$;

-- No UPDATE policy on purpose: username cannot be changed.
-- No DELETE policy on purpose: username cannot be removed by clients.

COMMIT;
