'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, MessageCircle, ArrowRight, Settings } from 'lucide-react';
import type { Character } from '@/lib/types';

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCharacters() {
      try {
        const res = await fetch('/api/characters');
        if (!res.ok) throw new Error('불러오기 실패');
        const data = await res.json();
        setCharacters(data.characters || []);
      } catch {
        setError('캐릭터 목록을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }
    fetchCharacters();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white/80" />
            <span className="text-white text-xl font-bold tracking-tight">maksh</span>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            관리자
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            AI 캐릭터와
            <br />
            <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              대화를 시작하세요
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mb-8">
            maksh에서 AI 캐릭터와 자연스러운 대화를 나누세요.
            대화에 따라 캐릭터의 모습이 실시간으로 변화합니다.
          </p>
        </div>
      </section>

      {/* Character Grid */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/40 text-sm">캐릭터를 불러오는 중...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-red-400/70 text-sm">{error}</div>
            </div>
          ) : characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <MessageCircle className="w-12 h-12 text-white/20" />
              <p className="text-white/40 text-sm">
                아직 등록된 캐릭터가 없습니다.
              </p>
              <Link
                href="/admin"
                className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
              >
                관리자 페이지에서 캐릭터를 등록해주세요 →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((char) => (
                <Link
                  key={char.id}
                  href={`/chat/${char.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-slate-800/40 border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={char.current_image_url}
                      alt={char.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-white text-xl font-bold mb-1">
                        {char.name}
                      </h3>
                      <p className="text-white/60 text-sm line-clamp-2 mb-3">
                        {char.description}
                      </p>
                      <div className="flex items-center gap-1 text-sky-400 text-sm font-medium group-hover:gap-2 transition-all">
                        대화 시작
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <span className="text-white/30 text-sm">maksh — AI 캐릭터 인터랙션 플랫폼</span>
        </div>
      </footer>
    </div>
  );
}
