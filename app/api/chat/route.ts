import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
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

    const supabase = createServerClient();

    // Get character info
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .maybeSingle();

    if (charError || !character) {
      return NextResponse.json(
        { error: '캐릭터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const existingMessages = (session.messages as ChatMessage[]) || [];
    const currentState = (session.state as CharacterState) || {};

    // Generate AI response
    const result = await generateChatResponse(
      character.name,
      character.description,
      character.personality,
      character.initial_prompt,
      existingMessages,
      message,
      currentState
    );

    // Update session with new messages and state
    const updatedMessages: ChatMessage[] = [
      ...existingMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: result.reply },
    ];

    await supabase
      .from('sessions')
      .update({
        messages: updatedMessages,
        state: result.newState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    const response: ChatApiResponse = {
      reply: result.reply,
      newState: result.newState,
      imageRequired: result.imageRequired,
      imagePrompt: result.imagePrompt,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: '대화 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
