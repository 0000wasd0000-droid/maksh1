'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check sessionStorage for auth state
    const authed = sessionStorage.getItem('maksh_admin_auth') === 'true';
    if (authed) setAuthenticated(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          sessionStorage.setItem('maksh_admin_auth', 'true');
          setAuthenticated(true);
        } else {
          setError(data.message || '비밀번호가 올바르지 않습니다.');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || '로그인에 실패했습니다.');
      }
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (authenticated) {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <a
          href="/"
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </a>

        <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-white/70" />
            </div>
            <h1 className="text-white text-xl font-bold">관리자 로그인</h1>
            <p className="text-white/40 text-sm mt-1">maksh 관리자 페이지</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-white text-black rounded-xl py-3 font-medium text-sm hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [characters, setCharacters] = useState<CharacterAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  interface CharacterAdmin {
    id: string;
    name: string;
    description: string;
    personality: string;
    initial_prompt: string;
    image_url: string;
    current_image_url: string;
    created_at: string;
  }

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/characters');
      if (res.ok) {
        const data = await res.json();
        setCharacters(data.characters || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/characters?id=${id}`, { method: 'DELETE' });
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md bg-black/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-white text-xl font-bold">maksh 관리자</h1>
            <span className="text-white/30 text-sm">대시보드</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-white/50 hover:text-white transition-colors text-sm"
            >
              홈으로
            </a>
            <button
              onClick={() => {
                sessionStorage.removeItem('maksh_admin_auth');
                window.location.reload();
              }}
              className="text-white/50 hover:text-white transition-colors text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-2xl font-bold">캐릭터 관리</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-white text-black rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/90 transition-all"
          >
            새 캐릭터 등록
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40 text-sm mb-4">등록된 캐릭터가 없습니다.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
            >
              첫 캐릭터를 등록해보세요 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((char) => (
              <div
                key={char.id}
                className="bg-slate-800/40 border border-white/10 rounded-2xl overflow-hidden"
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={char.image_url}
                    alt={char.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="text-white font-bold">{char.name}</h3>
                  <p className="text-white/50 text-xs line-clamp-2">{char.description}</p>
                  <div className="pt-2 flex gap-2">
                    <a
                      href={`/chat/${char.id}`}
                      className="flex-1 text-center text-sm text-white/70 hover:text-white border border-white/10 hover:border-white/30 rounded-lg py-2 transition-all"
                    >
                      대화하기
                    </a>
                    <button
                      onClick={() => setDeleteConfirm(char.id)}
                      className="text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-3 py-2 text-sm transition-all"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create form modal */}
      {showForm && (
        <CharacterForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            fetchCharacters();
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-2">캐릭터 삭제</h3>
            <p className="text-white/50 text-sm mb-6">
              이 캐릭터를 정말 삭제하시겠습니까? 모든 대화 기록도 함께 삭제됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-white/10 text-white/70 hover:text-white rounded-xl py-2.5 text-sm transition-all"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-400 transition-all"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('PNG, JPG, WEBP 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !personality.trim() || !initialPrompt.trim() || !imageFile) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload image
      setUploading(true);
      const formData = new FormData();
      formData.append('file', imageFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || '이미지 업로드 실패');
      }
      setUploading(false);

      const { url } = await uploadRes.json();

      // Create character
      const createRes = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          personality: personality.trim(),
          initial_prompt: initialPrompt.trim(),
          image_url: url,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || '캐릭터 생성 실패');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto chat-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-xl font-bold mb-6">새 캐릭터 등록</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-2 block">
              캐릭터 이미지 <span className="text-white/30">(PNG/JPG/WEBP, 최대 10MB)</span>
            </label>
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-white/15 hover:border-white/30 rounded-xl overflow-hidden transition-colors aspect-[3/4] max-w-[200px] flex items-center justify-center bg-white/5">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/30 text-sm">클릭하여 이미지 선택</span>
                )}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Name */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-1.5 block">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="캐릭터 이름"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-1.5 block">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="캐릭터에 대한 간단한 설명"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {/* Personality */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-1.5 block">성격</label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="캐릭터의 성격과 특징"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {/* Initial Prompt */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-1.5 block">
              초기 프롬프트 <span className="text-white/30">(AI에게 전달할 시스템 프롬프트)</span>
            </label>
            <textarea
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              placeholder="캐릭터가 어떻게 행동하고 말해야 하는지 상세히 서술하세요"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/10 text-white/70 hover:text-white rounded-xl py-3 text-sm transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-white text-black rounded-xl py-3 text-sm font-medium hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploading ? '이미지 업로드 중...' : '생성 중...'}
                </>
              ) : (
                '캐릭터 생성'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
