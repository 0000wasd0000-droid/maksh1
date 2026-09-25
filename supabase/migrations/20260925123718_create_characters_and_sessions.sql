/*
# Create maksh character interaction platform tables

## Summary
Creates the database schema for "maksh", a Korean AI character interaction platform.
Characters are created by an admin (password-protected via env var, not Supabase auth).
Sessions are conversation instances between a user and a character.

## New Tables

### characters
- `id` (uuid, PK) — unique character identifier
- `name` (text, not null) — character display name
- `description` (text, not null) — character description
- `personality` (text, not null) — character personality traits
- `initial_prompt` (text, not null) — system prompt for Gemini to initialize the character
- `image_url` (text, not null) — original admin-uploaded image URL (Vercel Blob), never overwritten
- `current_image_url` (text, not null) — current image URL, modified by Gemini during conversation; reset to image_url on "새로 시작"
- `created_at` (timestamptz) — creation timestamp

### sessions
- `id` (uuid, PK) — unique session identifier
- `character_id` (uuid, FK → characters.id) — associated character
- `messages` (jsonb, default '[]') — conversation history array of {role, content}
- `state` (jsonb, default '{}') — character state JSON (body, expression, outfit, etc.)
- `current_image_url` (text) — session-specific current image URL (may differ from character's)
- `created_at` (timestamptz) — creation timestamp
- `updated_at` (timestamptz) — last update timestamp

## Security
- RLS enabled on both tables.
- This is a no-auth app (admin uses env-var password, not Supabase auth).
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because data is intentionally public/shared — anyone can view characters and create sessions.
- Admin protection for character create/delete is enforced at the API route level,
  not at the database level.
*/

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  personality text NOT NULL,
  initial_prompt text NOT NULL,
  image_url text NOT NULL,
  current_image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_characters" ON characters;
CREATE POLICY "anon_select_characters" ON characters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_characters" ON characters;
CREATE POLICY "anon_insert_characters" ON characters FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_characters" ON characters;
CREATE POLICY "anon_update_characters" ON characters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_characters" ON characters;
CREATE POLICY "anon_delete_characters" ON characters FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sessions_character_id ON sessions(character_id);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);