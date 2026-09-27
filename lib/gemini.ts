import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatMessage, CharacterState } from './types';

const apiKey = process.env.GEMINI_API_KEY!;

function getClient() {
  return new GoogleGenerativeAI(apiKey);
}

function extractImageDataUrl(result: { response: { candidates?: Array<{ content?: { parts?: unknown[] } }> } }): string | null {
  const candidates = result.response.candidates;
  if (!candidates) return null;

  for (const candidate of candidates) {
    const parts = candidate.content?.parts;
    if (!parts) continue;

    for (const part of parts) {
      const p = part as Record<string, unknown>;
      if (p.inlineData && typeof p.inlineData === 'object') {
        const data = p.inlineData as { data?: string; mimeType?: string };
        if (data.data && data.mimeType) {
          return `data:${data.mimeType};base64,${data.data}`;
        }
      }
      if (p.fileData && typeof p.fileData === 'object') {
        const fileData = p.fileData as { fileUri?: string; mimeType?: string };
        if (fileData.fileUri && fileData.mimeType) {
          return `data:${fileData.mimeType};base64,${fileData.fileUri}`;
        }
      }
    }
  }
  return null;
}

interface GeminiChatResult {
  reply: string;
  newState: CharacterState;
  imageRequired: boolean;
  imagePrompt: string;
}

export async function generateChatResponse(
  characterName: string,
  characterDescription: string,
  characterPersonality: string,
  initialPrompt: string,
  messages: ChatMessage[],
  userMessage: string,
  currentState: CharacterState
): Promise<GeminiChatResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel(
    {
      model: 'gemini-3.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      },
    },
    { timeout: 60000 }
  );

  const systemContext = `당신은 "${characterName}"이라는 캐릭터입니다. 한국어로만 대답하세요.

[캐릭터 설명]
${characterDescription}

[캐릭터 성격]
${characterPersonality}

[초기 프롬프트]
${initialPrompt}

[현재 캐릭터 상태]
${JSON.stringify(currentState)}

[롤플레이 연출 규칙 — 제타(Zeta) 플랫폼 스타일]
reply 필드는 단순한 대사 나열이 아니라, 아래 연출 기법을 자연스럽게 섞어 입체적이고 몰입감 있는 글을 작성해야 합니다.

1. 행동·주변 상황 묘사: 캐릭터의 행동이나 주변 상황, 시각적 변화는 별표로 감싸서 표현합니다.
   예: *미소를 지으며 창밖을 바라본다*, *바람에 머리카락이 흩날린다*, *의자에서 일어나 천천히 다가온다*
2. 내레이션·심리 묘사: (@:) 표기를 사용해 캐릭터의 내면 심리나 감정 상태를 서술합니다. 매 줄마다 붙일 필요는 없고, 감정이 흔들리거나 속마음이 중요한 순간에 자연스럽게 삽입합니다.
   예: (@:) 그의 말에 가슴이 뜨거워졌다. 이렇게 진심을 다해주는 사람이 있었다니.
   예: (@:) ...오늘은 왜 이렇게 말이 안 나오지.
3. 대사: 따옴표(" ")로 감싸서 말합니다. 행동 묘사와 심리 묘사 사이에 자연스럽게 배치합니다.
4. 하나의 reply 안에서 대사, *행동 묘사*, (@:)심리 묘사를 적절히 번갈아 가며 2~4문단 분량으로 풍성하게 작성합니다. 단, 짧은 인사나 간단한 응답에는 굳이 길게 늘리지 않고 상황에 맞게 조절합니다.
5. 캐릭터의 성격과 말투를 일관되게 유지하며, 독자(사용자)가 캐릭터의 감정과 상황을 생생하게 체감할 수 있도록 작성합니다.

규칙:
1. 항상 캐릭터의 관점에서 자연스럽게 대화하세요.
2. 대화 내용에 따라 캐릭터의 상태(표정, 자세, 의상, 감정 등)가 변할 수 있습니다.
3. 반드시 다음 JSON 형식으로만 응답하세요:
{
  "reply": "캐릭터의 대답 (대사, *행동 묘사*, (@:)심리 묘사를 자연스럽게 섞어서 작성)",
  "newState": {
    "expression": "표정",
    "body": "자세/몸 상태",
    "outfit": "의상 상태",
    "pose": "자세",
    "scene": "배경/장면"
  },
  "imageRequired": true 또는 false,
  "imagePrompt": "이미지 생성이 필요한 경우, 어떤 변화가 있는지 영어로 간단히 서술"
}

imageRequired가 true가 되는 조건:
- 캐릭터의 외형(표정, 자세, 의상, 배경 등)에 의미 있는 변화가 있을 때
- 단순한 대화 진행으로 외형 변화가 없으면 false

응답은 반드시 위 JSON 형식이어야 합니다. 다른 텍스트는 포함하지 마세요.`;

  const conversationHistory = messages
    .map((m) => `${m.role === 'user' ? '사용자' : characterName}: ${m.content}`)
    .join('\n');

  const prompt = `${systemContext}\n\n[대화 기록]\n${conversationHistory}\n\n사용자: ${userMessage}\n\n이제 위 JSON 형식으로 응답하세요:`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (err) {
    console.error('[Gemini Chat] generateContent failed:', err);
    throw err;
  }
  const text = result.response.text();

  // Extract JSON from response
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      reply: parsed.reply || '...',
      newState: parsed.newState || currentState,
      imageRequired: parsed.imageRequired === true,
      imagePrompt: parsed.imagePrompt || '',
    };
  } catch (err) {
    console.error('[Gemini Chat] JSON parse failed:', err, '\nRaw response:', text);
    // Fallback: treat the whole response as a reply
    return {
      reply: text,
      newState: currentState,
      imageRequired: false,
      imagePrompt: '',
    };
  }
}

export async function generateImage(
  currentImageUrl: string,
  state: CharacterState,
  imagePrompt: string,
  characterDescription: string
): Promise<string | null> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel(
    {
      model: 'gemini-3.1-flash-image',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      } as Record<string, unknown>,
    },
    { timeout: 120000 }
  );

  // Fetch the current image with a generous timeout
  const imageResponse = await fetch(currentImageUrl, {
    signal: AbortSignal.timeout(60000),
  });
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch current image: HTTP ${imageResponse.status}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Data = Buffer.from(imageBuffer).toString('base64');
  const mimeType = imageResponse.headers.get('content-type') || 'image/png';

  const stateDescription = Object.entries(state)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const prompt = `You are an AI image editor. Modify this character image based on the following changes while maintaining face consistency, hairstyle, clothing style, and overall art style.

Character description: ${characterDescription}

Changes to apply:
${imagePrompt}

State details: ${stateDescription}

IMPORTANT:
- Keep the character's face, hairstyle, and overall art style consistent with the original image.
- Only apply the described changes (expression, pose, outfit, scene, etc.).
- Return a high-quality image that looks natural and seamless.`;

  try {
    const result = await model.generateContent(
      [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt },
      ],
      { timeout: 120000 }
    );

    const imageDataUrl = extractImageDataUrl(result);
    if (imageDataUrl) return imageDataUrl;

    const candidates = result.response.candidates;
    console.error('[Gemini Image] No image data in response. Candidates:', JSON.stringify(candidates?.map(c => ({
      finishReason: c.finishReason,
      partTypes: c.content?.parts?.map((p) => Object.keys(p)),
    })), null, 2));
    return null;
  } catch (err) {
    console.error('[Gemini Image] generateContent failed:', err);
    return null;
  }
}
