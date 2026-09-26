import { NextResponse } from 'next/server';
import { turso, initDatabase, generateId } from '@/lib/turso';
import type { Session, ChatMessage, CharacterState } from '@/lib/types';

export const runtime = 'nodejs';

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    character_id: row.character_id as string,
    messages: JSON.parse(row.messages as string) as ChatMessage[],
    state: JSON.parse(row.state as string) as CharacterState,
    current_image_url: (row.current_image_url as string) || null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    await initDatabase();

    let result;
    if (characterId) {
      result = await turso.execute({
        sql: 'SELECT * FROM sessions WHERE character_id = ? ORDER BY updated_at DESC',
        args: [characterId],
      });
    } else {
      result = await turso.execute(
        'SELECT * FROM sessions ORDER BY updated_at DESC'
      );
    }

    const sessions = result.rows.map((row) =>
      rowToSession(row as unknown as Record<string, unknown>)
    );

    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json(
      { error: '세션 목록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json(
        { error: '캐릭터 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await initDatabase();

    // Get character to copy image_url
    const charResult = await turso.execute({
      sql: 'SELECT image_url FROM characters WHERE id = ?',
      args: [characterId],
    });

    if (charResult.rows.length === 0) {
      return NextResponse.json(
        { error: '캐릭터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const imageUrl = charResult.rows[0].image_url as string;
    const id = generateId();

    await turso.execute({
      sql: `INSERT INTO sessions (id, character_id, messages, state, current_image_url) VALUES (?, ?, '[]', '{}', ?)`,
      args: [id, characterId, imageUrl],
    });

    const result = await turso.execute({
      sql: 'SELECT * FROM sessions WHERE id = ?',
      args: [id],
    });

    const session = rowToSession(
      result.rows[0] as unknown as Record<string, unknown>
    );

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: '세션을 생성할 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, messages, state, currentImageUrl } = body;

    if (!id) {
      return NextResponse.json(
        { error: '세션 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await initDatabase();

    const updates: string[] = ["updated_at = datetime('now')"];
    const args: (string | unknown)[] = [];

    if (messages !== undefined) {
      updates.push('messages = ?');
      args.push(JSON.stringify(messages));
    }
    if (state !== undefined) {
      updates.push('state = ?');
      args.push(JSON.stringify(state));
    }
    if (currentImageUrl !== undefined) {
      updates.push('current_image_url = ?');
      args.push(currentImageUrl);
    }

    args.push(id);

    await turso.execute({
      sql: `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`,
      args: args as string[],
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '세션을 업데이트할 수 없습니다.' },
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
        { error: '세션 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await initDatabase();
    await turso.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '세션을 삭제할 수 없습니다.' },
      { status: 500 }
    );
  }
}
