import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: '파일을 선택해주세요.' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'PNG, JPG, WEBP 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: '이미지 저장이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const filename = `maksh/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Use Vercel Blob REST API directly (avoids SDK bundling issues)
    const uploadRes = await fetch(
      `https://blob.vercel.com?filename=${encodeURIComponent(filename)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${blobToken}`,
          'x-content-type': file.type,
        },
        body: file,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      console.error('Blob upload failed:', uploadRes.status, errText);
      return NextResponse.json(
        { error: '이미지 업로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    const blobData = await uploadRes.json();
    return NextResponse.json({ url: blobData.url });
  } catch {
    return NextResponse.json(
      { error: '이미지 업로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
