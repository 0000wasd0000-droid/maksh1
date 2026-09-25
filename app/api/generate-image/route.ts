import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { generateImage } from '@/lib/gemini';
import type { GenerateImageApiResponse, CharacterState } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, characterId, state, imagePrompt } = body as {
      sessionId: string;
      characterId: string;
      state: CharacterState;
      imagePrompt: string;
    };

    if (!sessionId || !characterId) {
      return NextResponse.json(
        { error: '세션 ID와 캐릭터 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get session to find current image
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('current_image_url')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const currentImageUrl = session.current_image_url;
    if (!currentImageUrl) {
      return NextResponse.json(
        { error: '현재 이미지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Get character description for consistency
    const { data: character } = await supabase
      .from('characters')
      .select('description')
      .eq('id', characterId)
      .maybeSingle();

    const description = character?.description || '';

    // Generate new image
    const newImageUrl = await generateImage(
      currentImageUrl,
      state,
      imagePrompt || '',
      description
    );

    if (!newImageUrl) {
      return NextResponse.json(
        { error: '이미지 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Update session with new image
    await supabase
      .from('sessions')
      .update({
        current_image_url: newImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    const response: GenerateImageApiResponse = { imageUrl: newImageUrl };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: '이미지 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
