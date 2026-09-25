export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  initial_prompt: string;
  image_url: string;
  current_image_url: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CharacterState {
  body?: string;
  expression?: string;
  outfit?: string;
  pose?: string;
  scene?: string;
  [key: string]: string | undefined;
}

export interface Session {
  id: string;
  character_id: string;
  messages: ChatMessage[];
  state: CharacterState;
  current_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatApiResponse {
  reply: string;
  newState: CharacterState;
  imageRequired: boolean;
  imagePrompt?: string;
}

export interface GenerateImageApiResponse {
  imageUrl: string;
}
