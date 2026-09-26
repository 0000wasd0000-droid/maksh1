interface TursoRow {
  [key: string]: unknown;
}

interface TursoResult {
  rows: TursoRow[];
  changes: number;
  lastInsertRowid: string | null;
}

interface TursoColumn {
  name: string;
  decltype: string;
}

interface TursoValue {
  type: string;
  value?: unknown;
  base64?: string;
}

type SqlArg = string | number | null;

let baseUrl: string | null = null;
let authToken: string | null = null;

function getConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL이 설정되지 않았습니다.');
  }

  baseUrl = url.replace('libsql://', 'https://');
  authToken = token || null;
}

function toTursoArg(arg: SqlArg): Record<string, unknown> {
  if (arg === null || arg === undefined) {
    return { type: 'null' };
  }
  if (typeof arg === 'number') {
    return { type: Number.isInteger(arg) ? 'integer' : 'float', value: arg };
  }
  return { type: 'text', value: String(arg) };
}

function fromTursoValue(val: TursoValue): unknown {
  if (val.type === 'null') return null;
  if (val.type === 'blob' && val.base64) return val.base64;
  return val.value ?? null;
}

async function executePipeline(
  sql: string,
  args: SqlArg[] = []
): Promise<TursoResult> {
  if (!baseUrl) getConfig();

  const response = await fetch(`${baseUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: args.map(toTursoArg),
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Turso HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const result = data.results?.[0];

  if (!result || result.type === 'error') {
    const errorMsg = result?.error?.message || 'Unknown Turso error';
    throw new Error(`Turso error: ${errorMsg}`);
  }

  const res = result.response?.result;
  if (!res) {
    return { rows: [], changes: 0, lastInsertRowid: null };
  }

  const cols: TursoColumn[] = res.cols || [];
  const rawRows: TursoValue[][] = res.rows || [];
  const colNames = cols.map((c) => c.name);

  const rows: TursoRow[] = rawRows.map((rawRow) => {
    const obj: TursoRow = {};
    rawRow.forEach((val, i) => {
      obj[colNames[i]] = fromTursoValue(val);
    });
    return obj;
  });

  return {
    rows,
    changes: res.affected_row_count || 0,
    lastInsertRowid: res.last_insert_rowid ?? null,
  };
}

export const turso = {
  execute(sqlOrObj: string | { sql: string; args?: SqlArg[] }): Promise<TursoResult> {
    if (typeof sqlOrObj === 'string') {
      return executePipeline(sqlOrObj, []);
    }
    return executePipeline(sqlOrObj.sql, sqlOrObj.args || []);
  },
};

export async function initDatabase() {
  await executePipeline(`
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

  await executePipeline(`
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

  await executePipeline(
    `CREATE INDEX IF NOT EXISTS idx_sessions_character_id ON sessions(character_id)`
  );
  await executePipeline(
    `CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC)`
  );
}

export function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
