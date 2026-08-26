import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Sparkles } from 'lucide-react';

export default function Login() {
  const { user, isAuthenticated, hasSpace, loading, login, setNickname, createSpace, joinSpace } = useAuth();
  const navigate = useNavigate();
  
  const [nicknameInput, setNicknameInput] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated && hasSpace) {
      navigate('/home', { replace: true });
    }
  }, [loading, isAuthenticated, hasSpace, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-400">
        서재를 불러오는 중...
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login();
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        setErrorMsg('팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제하거나 우측 상단의 "새 탭에서 열기"를 클릭해주세요.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setErrorMsg('승인되지 않은 도메인입니다. 우측 상단의 "새 탭에서 열기"를 클릭하여 새 창에서 로그인해주세요.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('로그인 창이 닫혔습니다. 다시 시도해주세요.');
      } else {
        setErrorMsg('로그인 중 문제가 발생했습니다. 새 창에서 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nicknameInput.trim().length >= 2) {
      setIsSubmitting(true);
      setErrorMsg(null);
      try {
        await setNickname(nicknameInput.trim());
      } catch (error) {
        setErrorMsg('닉네임 저장에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCreateSpace = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await createSpace();
    } catch (error) {
      setErrorMsg('서재 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      setIsSubmitting(true);
      setErrorMsg(null);
      try {
        await joinSpace(inviteCode.trim());
      } catch (error) {
        setErrorMsg('초대 코드를 확인하고 다시 시도해주세요.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Determine current step based on Firebase auth state
  let step: 'login' | 'nickname' | 'space' = 'login';
  if (user && !user.nickname) {
    step = 'nickname';
  } else if (user && user.nickname && !hasSpace) {
    step = 'space';
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
            <BookOpen className="w-7 h-7 text-gray-900" />
          </div>
          <h1 className="text-2xl font-medium text-gray-900 tracking-tight">사유의 서재</h1>
          <p className="text-sm text-gray-400 mt-2 font-light">
            두 사람이 함께 읽고 사유하는 둘만의 공유 서재
          </p>
        </div>

        {step === 'login' && (
          <div className="mt-8 space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-800 bg-white hover:bg-gray-50 active:scale-[0.99] transition-all disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSubmitting ? '로그인 연결 중...' : 'Google 계정으로 시작하기'}</span>
            </button>
            {errorMsg && (
              <p className="text-xs text-red-500 text-center break-keep leading-relaxed pt-2">
                {errorMsg}
              </p>
            )}
          </div>
        )}

        {step === 'nickname' && (
          <form onSubmit={handleNicknameSubmit} className="mt-8 space-y-6">
            <div className="space-y-2">
              <label htmlFor="nickname" className="block text-xs font-medium text-gray-700">
                서재에서 파트너에게 표시될 이름
              </label>
              <input
                id="nickname"
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="예: 민아, 진우 (2~12자)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm transition-all"
                minLength={2}
                maxLength={12}
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || nicknameInput.trim().length < 2}
              className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            >
              {isSubmitting ? '저장 중...' : '다음 단계로'}
            </button>
            {errorMsg && (
              <p className="text-xs text-red-500 text-center break-keep leading-relaxed pt-2">
                {errorMsg}
              </p>
            )}
          </form>
        )}

        {step === 'space' && (
          <div className="mt-8 space-y-8">
            {errorMsg && (
              <p className="text-xs text-red-500 text-center break-keep leading-relaxed pb-2">
                {errorMsg}
              </p>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-900">
                <Sparkles className="w-3.5 h-3.5 text-gray-900" />
                <span>새로운 공유 서재 만들기</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                새 서재를 개설하고 생성된 초대 코드를 파트너에게 전달하세요.
              </p>
              <button
                onClick={handleCreateSpace}
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 active:scale-[0.99] disabled:bg-gray-100 transition-all shadow-sm"
              >
                {isSubmitting ? '서재 만드는 중...' : '새 서재 개설하기'}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400">또는</span>
              </div>
            </div>

            <form onSubmit={handleJoinSpace} className="space-y-3">
              <h3 className="text-xs font-medium text-gray-900">초대 코드로 참여하기</h3>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="예: SAYU-1234"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm uppercase tracking-wider font-mono transition-all"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting || !inviteCode.trim()}
                className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              >
                {isSubmitting ? '서재 찾는 중...' : '초대된 서재로 입장'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
