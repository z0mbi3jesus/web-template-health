-- Retired unsafe development helper. Use schema.sql and migrations 002/003.
DO $$ BEGIN RAISE EXCEPTION 'Disabling row level security is no longer supported'; END $$;
