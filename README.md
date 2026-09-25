# maksh

AI 캐릭터와 대화하는 인터랙티브 플랫폼

## 기능

- **캐릭터 채팅**: AI 캐릭터와 실시간 대화
- **실시간 이미지 변화**: 대화에 따라 캐릭터의 모습이 Gemini AI로 변화
- **글래스모피즘 UI**: 풀스크린 배경 이미지 위에 반투명 채팅 패널
- **관리자 대시보드**: 캐릭터 생성, 조회, 삭제
- **ImgBB 이미지 업로드**: 캐릭터 이미지 관리

## 기술 스택

- Next.js 13 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Lucide Icons
- Turso (libSQL) 데이터베이스
- Google Gemini AI (대화 + 이미지 생성)
- ImgBB (이미지 호스팅)

## 환경변수

```
TURSO_DATABASE_URL=libsql://your-database.turso.co
TURSO_AUTH_TOKEN=your-auth-token
GEMINI_API_KEY=your-gemini-api-key
IMGBB_API_KEY=your-imgbb-api-key
ADMIN_PASSWORD=0000
```

## 시작하기

```bash
npm install
npm run dev
```

## 배포 (Vercel)

1. GitHub에 푸시
2. Vercel에서 프로젝트 임포트
3. 환경변수 설정
4. 배포
