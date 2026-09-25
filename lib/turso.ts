import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

export function getTursoClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL이 설정되지 않았습니다.');
  }

  client = createClient({
    url,
    authToken: authToken || undefined,
  });

  return client;
}

export async function initDatabase() {
  const db = getTursoClient();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      personality TEXT NOT NULL,
      initial_prompt TEXT NOT NULL,
      image_url TEXT NOT NULL,
      current_image_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      character_id TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      state TEXT NOT NULL DEFAULT '{}',
      current_image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_sessions_character_id ON sessions(character_id)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC)
  `);
}

export function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
