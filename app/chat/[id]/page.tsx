'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, RotateCcw, Loader2, ImageIcon } from 'lucide-react';
import type { Character, ChatMessage, CharacterState } from '@/lib/types';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.id as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch character and create session
  useEffect(() => {
    async function init() {
      try {
        const charRes = await fetch('/api/characters');
        if (!charRes.ok) throw new Error('캐릭터 조회 실패');
        const charData = await charRes.json();
        const found = charData.characters?.find((c: Character) => c.id === characterId);
        if (!found) {
          setError('캐릭터를 찾을 수 없습니다.');
          setLoading(false);
          return;
        }
        setCharacter(found);
        setCurrentImageUrl(found.current_image_url);

        // Create new session
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId }),
        });
        if (!sessionRes.ok) throw new Error('세션 생성 실패');
        const sessionData = await sessionRes.json();
        setSessionId(sessionData.session.id);
        setCurrentImageUrl(sessionData.session.current_image_url || found.current_image_url);
      } catch {
        setError('페이지를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [characterId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sessionId || !character || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          characterId,
          message: userMessage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '대화 실패');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, assistantMsg]);

      // If image generation required, trigger it
      if (data.imageRequired && data.imagePrompt) {
        setImageLoading(true);
        setFadeOut(true);

        setTimeout(async () => {
          try {
            const imgRes = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                characterId,
                state: data.newState,
                imagePrompt: data.imagePrompt,
              }),
            });

            if (imgRes.ok) {
              const imgData = await imgRes.json();
              setCurrentImageUrl(imgData.imageUrl);
            }
          } catch {
            // Silent fail — image generation is non-critical
          } finally {
            setFadeOut(false);
            setTimeout(() => setImageLoading(false), 800);
          }
        }, 600);
      }
    } catch {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: '죄송합니다, 응답을 생성할 수 없습니다. 다시 시도해주세요.',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sessionId, character, sending, characterId]);

  const handleReset = useCallback(async () => {
    if (!character || !sessionId) return;

    setFadeOut(true);
    setMessages([]);
    setImageLoading(true);

    setTimeout(async () => {
      try {
        await fetch('/api/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sessionId,
            messages: [],
            state: {} as CharacterState,
            currentImageUrl: character.image_url,
          }),
        });
        setCurrentImageUrl(character.image_url);
      } catch {
        // non-critical
      } finally {
        setFadeOut(false);
        setTimeout(() => setImageLoading(false), 800);
      }
    }, 600);
  }, [character, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
          <p className="text-white/40 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-white/60 text-sm">{error || '캐릭터를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.push('/')}
            className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950">
      {/* Full-screen background image */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {currentImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImageUrl}
            alt={character.name}
            className="w-full h-full object-cover"
            key={currentImageUrl}
          />
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
      </div>

      {/* Image loading overlay */}
      {imageLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 animate-fadeIn">
            <Loader2 className="w-6 h-6 text-white/80 animate-spin" />
            <p className="text-white/80 text-sm font-medium">
              캐릭터의 모습이 변화하는 중...
            </p>
          </div>
        </div>
      )}

      {/* Glass header */}
      <header className="absolute top-0 left-0 right-0 z-20 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">뒤로</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-white font-bold text-lg">{character.name}</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/60 text-xs">대화 중</span>
            </div>
          </div>
          <button
            onClick={handleReset}
            disabled={imageLoading}
            className="flex items-center gap-2 text-white/60 hover:text-white disabled:opacity-30 transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">새로 시작</span>
          </button>
        </div>
      </header>

      {/* Floating glassmorphism chat panel — bottom-right */}
      <div className="absolute bottom-0 right-0 z-20 w-full sm:w-[440px] md:w-[480px] h-[55vh] sm:h-[65vh] sm:mb-4 sm:mr-4">
        <div className="h-full backdrop-blur-md bg-black/40 border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <p className="text-white/50 text-sm">
                  {character.name}와(과) 대화를 시작하세요.
                </p>
                <p className="text-white/30 text-xs">{character.description}</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-sky-500/80 text-white rounded-br-sm'
                        : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white/10 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-white/10 p-3 bg-black/20">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                rows={1}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none max-h-24 transition-colors"
                style={{ minHeight: '42px' }}
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-400 disabled:bg-white/10 disabled:text-white/30 transition-all"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image generation indicator (bottom-left, when active) */}
      {imageLoading && (
        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2 backdrop-blur-md bg-black/40 border border-white/10 rounded-xl px-4 py-2.5">
          <ImageIcon className="w-4 h-4 text-white/60 animate-pulseGlow" />
          <span className="text-white/70 text-xs">이미지 생성 중...</span>
        </div>
      )}
    </div>
  );
}
