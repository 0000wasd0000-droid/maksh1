import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import type { Character } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: '캐릭터 목록을 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ characters: data as Character[] });
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
    const { name, description, personality, initial_prompt, image_url } = body;

    if (!name || !description || !personality || !initial_prompt || !image_url) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('characters')
      .insert({
        name,
        description,
        personality,
        initial_prompt,
        image_url,
        current_image_url: image_url,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: '캐릭터를 생성할 수 없습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ character: data as Character });
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
        { error: '캐릭터 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('characters').delete().eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: '캐릭터를 삭제할 수 없습니다.' },
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
