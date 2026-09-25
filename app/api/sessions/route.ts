import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import type { Session, ChatMessage, CharacterState } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (characterId) {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('character_id', characterId)
        .order('updated_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: '세션 목록을 불러올 수 없습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ sessions: data as Session[] });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: '세션 목록을 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data as Session[] });
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
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

    const supabase = createServerClient();

    // Get character to copy image_url
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('image_url')
      .eq('id', characterId)
      .maybeSingle();

    if (charError || !character) {
      return NextResponse.json(
        { error: '캐릭터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        character_id: characterId,
        messages: [] as ChatMessage[],
        state: {} as CharacterState,
        current_image_url: character.image_url,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: '세션을 생성할 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: data as Session });
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
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

    const supabase = createServerClient();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (messages !== undefined) updateData.messages = messages;
    if (state !== undefined) updateData.state = state;
    if (currentImageUrl !== undefined) updateData.current_image_url = currentImageUrl;

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: '세션을 업데이트할 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
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

    const supabase = createServerClient();
    const { error } = await supabase.from('sessions').delete().eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: '세션을 삭제할 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
