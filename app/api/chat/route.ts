import { NextResponse } from 'next/server';
import { turso, initDatabase } from '@/lib/turso';
import { generateChatResponse } from '@/lib/gemini';
import type { ChatMessage, CharacterState, ChatApiResponse } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, characterId, message } = body as {
      sessionId: string;
      characterId: string;
      message: string;
    };

    if (!sessionId || !characterId || !message) {
      return NextResponse.json(
        { error: '세션 ID, 캐릭터 ID, 메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    await initDatabase();

    // Get character info
    const charResult = await turso.execute({
      sql: 'SELECT * FROM characters WHERE id = ?',
      args: [characterId],
    });

    if (charResult.rows.length === 0) {
      return NextResponse.json(
        { error: '캐릭터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const character = charResult.rows[0] as unknown as Record<string, unknown>;

    // Get session
    const sessionResult = await turso.execute({
      sql: 'SELECT * FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const sessionRow = sessionResult.rows[0] as unknown as Record<string, unknown>;
    const existingMessages: ChatMessage[] = JSON.parse(sessionRow.messages as string) || [];
    const currentState: CharacterState = JSON.parse(sessionRow.state as string) || {};

    // Generate AI response
    let result;
    try {
      result = await generateChatResponse(
        character.name as string,
        character.description as string,
        character.personality as string,
        character.initial_prompt as string,
        existingMessages,
        message,
        currentState
      );
    } catch (err) {
      console.error('[Chat API] Gemini error:', err);
      return NextResponse.json(
        { error: 'AI 응답 생성에 실패했습니다.', detail: String(err) },
        { status: 500 }
      );
    }

    // Update session with new messages and state
    const updatedMessages: ChatMessage[] = [
      ...existingMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: result.reply },
    ];

    await turso.execute({
      sql: `UPDATE sessions SET messages = ?, state = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [JSON.stringify(updatedMessages), JSON.stringify(result.newState), sessionId],
    });

    const response: ChatApiResponse = {
      reply: result.reply,
      newState: result.newState,
      imageRequired: result.imageRequired,
      imagePrompt: result.imagePrompt,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[Chat API] Unhandled error:', err);
    return NextResponse.json(
      { error: '대화 처리 중 오류가 발생했습니다.', detail: String(err) },
      { status: 500 }
    );
  }
}
