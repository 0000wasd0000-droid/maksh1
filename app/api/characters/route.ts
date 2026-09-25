import { NextResponse } from 'next/server';
import { getTursoClient, initDatabase, generateId } from '@/lib/turso';
import type { Character } from '@/lib/types';

export const runtime = 'nodejs';

function rowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    personality: row.personality as string,
    initial_prompt: row.initial_prompt as string,
    image_url: row.image_url as string,
    current_image_url: row.current_image_url as string,
    created_at: row.created_at as string,
  };
}

export async function GET() {
  try {
    await initDatabase();
    const db = getTursoClient();
    const result = await db.execute(
      'SELECT * FROM characters ORDER BY created_at DESC'
    );

    const characters = result.rows.map((row) =>
      rowToCharacter(row as unknown as Record<string, unknown>)
    );

    return NextResponse.json({ characters });
  } catch {
    return NextResponse.json(
      { error: '캐릭터 목록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, personality, initial_prompt, image_url } = body;

    if (!name || !description || !personality || !initial_prompt || !image_url) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    await initDatabase();
    const db = getTursoClient();
    const id = generateId();

    await db.execute({
      sql: `INSERT INTO characters (id, name, description, personality, initial_prompt, image_url, current_image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, name, description, personality, initial_prompt, image_url, image_url],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM characters WHERE id = ?',
      args: [id],
    });

    const character = rowToCharacter(
      result.rows[0] as unknown as Record<string, unknown>
    );

    return NextResponse.json({ character });
  } catch {
    return NextResponse.json(
      { error: '캐릭터를 생성할 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '캐릭터 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await initDatabase();
    const db = getTursoClient();
    await db.execute({ sql: 'DELETE FROM characters WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '캐릭터를 삭제할 수 없습니다.' },
      { status: 500 }
    );
  }
}
