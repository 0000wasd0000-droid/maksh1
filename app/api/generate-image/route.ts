import { NextResponse } from 'next/server';
import { getTursoClient, initDatabase } from '@/lib/turso';
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

    await initDatabase();
    const db = getTursoClient();

    // Get session to find current image
    const sessionResult = await db.execute({
      sql: 'SELECT current_image_url FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const currentImageUrl = sessionResult.rows[0].current_image_url as string | null;
    if (!currentImageUrl) {
      return NextResponse.json(
        { error: '현재 이미지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Get character description for consistency
    const charResult = await db.execute({
      sql: 'SELECT description FROM characters WHERE id = ?',
      args: [characterId],
    });

    const description =
      (charResult.rows[0]?.description as string) || '';

    // Generate new image
    let newImageUrl: string | null;
    try {
      newImageUrl = await generateImage(
        currentImageUrl,
        state,
        imagePrompt || '',
        description
      );
    } catch (err) {
      console.error('[Image API] Gemini image generation error:', err);
      return NextResponse.json(
        { error: '이미지 생성 중 오류가 발생했습니다.', detail: String(err) },
        { status: 500 }
      );
    }

    if (!newImageUrl) {
      return NextResponse.json(
        { error: '이미지 생성에 실패했습니다. (응답에 이미지 데이터가 없습니다)' },
        { status: 500 }
      );
    }

    // Update session with new image
    await db.execute({
      sql: `UPDATE sessions SET current_image_url = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [newImageUrl, sessionId],
    });

    const response: GenerateImageApiResponse = { imageUrl: newImageUrl };
    return NextResponse.json(response);
  } catch (err) {
    console.error('[Image API] Unhandled error:', err);
    return NextResponse.json(
      { error: '이미지 생성 중 오류가 발생했습니다.', detail: String(err) },
      { status: 500 }
    );
  }
}
