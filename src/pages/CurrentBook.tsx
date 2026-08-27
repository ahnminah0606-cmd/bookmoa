import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { BookCover } from '@/components/common/BookCover';
import { BookOpen, ArrowRight, Check } from 'lucide-react';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export default function CurrentBook() {
  const { user, partner, spaceId } = useAuth();
  const { getActiveBooks, updateBook } = useData();
  
  // 'empty' | 'saving' | 'saved'
  const [status, setStatus] = useState<'empty' | 'saving' | 'saved'>('empty');
  const [content, setContent] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [discussionData, setDiscussionData] = useState<{
    user1Thought: string;
    user2Thought: string;
    sharedSummary: string;
    content: string;
    updatedAt?: string;
    updatedBy?: string;
  } | null>(null);

  const currentBook = getActiveBooks().find(b => b.status === 'reading');
  
  const me = user?.nickname || user?.displayName || '사용자 1';
  const partnerName = partner?.nickname || partner?.displayName || '파트너';

  // Listen to discussions for current book in Firestore
  useEffect(() => {
    if (!spaceId || !currentBook) {
      setDiscussionData(null);
      return;
    }

    const discRef = doc(db, 'spaces', spaceId, 'discussions', currentBook.id);
    const unsubscribe = onSnapshot(discRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setDiscussionData(data);
        if (data.content && !content) {
          setContent(data.content);
        }
        setStatus('saved');
      } else {
        setDiscussionData(null);
      }
    });

    return () => unsubscribe();
  }, [spaceId, currentBook?.id]);

  if (!currentBook) {
    return (
      <div className="max-w-xl mx-auto py-32 px-4 text-center space-y-6">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto border border-gray-100 text-gray-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-gray-900">현재 읽고 있는 책이 없습니다</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto break-keep">
            라이브러리에서 원하는 책을 선택하여 '현재 책으로 설정'하면 이곳에서 대화를 기록할 수 있습니다.
          </p>
        </div>
        <Link
          to="/library"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <span>라이브러리로 이동</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const handleSave = async () => {
    if (!content.trim()) return;
    setStatus('saving');
    setSaveError(null);

    let summaryText = `기록 정리: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('로그인이 필요합니다.');
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          title: currentBook.title,
          author: currentBook.author,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '요약 생성에 실패했습니다.');
      summaryText = data.summary;
    } catch (error) {
      console.error('OpenAI summary error:', error);
      setSaveError('AI 요약을 생성하지 못해 기본 요약으로 저장합니다.');
    }
    const newDisc = {
      id: currentBook.id,
      bookId: currentBook.id,
      content: content.trim(),
      user1Thought: content.trim(),
      user2Thought: discussionData?.user2Thought || '파트너의 기록을 기다리는 중입니다.',
      sharedSummary: summaryText,
      updatedAt: new Date().toISOString(),
      updatedBy: me
    };

    if (spaceId) {
      try {
        await setDoc(doc(db, 'spaces', spaceId, 'discussions', currentBook.id), newDisc);
        setDiscussionData(newDisc);
        setStatus('saved');
      } catch (err) {
        console.error("Error saving discussion to Firestore:", err);
        setStatus('empty');
      }
    } else {
      setDiscussionData(newDisc);
      setStatus('saved');
    }
  };

  const handleFinishBook = () => {
    if (window.confirm('이 책을 완독 처리하시겠습니까? 완독된 책의 사유는 라이브러리와 홈 화면에 기록됩니다.')) {
      updateBook(currentBook.id, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    }
  };

  const startedDate = currentBook.startedAt || currentBook.createdAt;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-12 border-b border-gray-100/60 gap-6">
        <div className="flex min-w-0 flex-col gap-5 min-[420px]:flex-row min-[420px]:items-end sm:gap-6">
          <BookCover
            title={currentBook.title}
            author={currentBook.author}
            coverImage={currentBook.coverImage}
            isbn={currentBook.isbn}
            size="lg"
            className="w-24 h-36 shrink-0"
          />
          <div className="min-w-0 space-y-3 pb-1">
            <h1 className="text-2xl md:text-3xl font-medium text-gray-900 tracking-tight break-words">
              {currentBook.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[15px] text-gray-400 font-light">
              <span>{currentBook.author}</span>
              <span>·</span>
              <span>
                읽는 중 ({startedDate ? new Date(startedDate).toLocaleDateString('ko-KR') : '방금'} 시작)
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleFinishBook}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors shrink-0 border border-gray-200 hover:border-gray-400"
        >
          이 책 완독하기
        </button>
      </div>

      {/* Results Area */}
      <div className="space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* User 1 Card */}
          <div className="bg-[#FAFAFA] rounded-2xl p-5 sm:p-8 flex min-w-0 flex-col space-y-4">
            <h3 className="text-sm font-medium text-gray-400">{me}</h3>
            <p className="text-gray-800 leading-relaxed text-[15px]">
              {discussionData?.user1Thought || '토론 기록을 작성하여 저장하면 이곳에 사유가 정리됩니다.'}
            </p>
          </div>
          {/* User 2 Card */}
          <div className="bg-[#FAFAFA] rounded-2xl p-5 sm:p-8 flex min-w-0 flex-col space-y-4">
            <h3 className="text-sm font-medium text-gray-700">{partnerName}</h3>
            <p className="text-gray-800 leading-relaxed text-[15px]">
              {discussionData?.user2Thought || '파트너의 사유가 이곳에 함께 기록됩니다.'}
            </p>
          </div>
        </div>

        {/* Shared Summary */}
        <div className="max-w-3xl mx-auto space-y-4 text-center pb-8">
          <h3 className="text-sm font-medium text-gray-400">생각 정리</h3>
          <p className="text-gray-800 leading-relaxed text-[15px]">
            {discussionData?.sharedSummary || '두 사람의 생각이 담긴 토론 기록을 남겨 보세요.'}
          </p>
        </div>
      </div>

      {/* Editor Area */}
      <div className="pt-24 border-t border-gray-100/60 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-400">토론 및 감상 기록</h3>
          {status === 'saving' && (
            <span className="text-xs text-gray-400">클라우드에 안전하게 저장 중...</span>
          )}
          {status === 'saved' && discussionData?.updatedAt && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>저장 완료 ({new Date(discussionData.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})</span>
            </span>
          )}
        </div>
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="통화나 대화에서 기억나는 말, 다르게 본 지점, 생각이 바뀐 계기를 자유롭게 적어보세요."
          className="w-full h-72 p-4 sm:p-8 bg-[#FAFAFA] rounded-2xl focus:bg-white focus:border-gray-300 border border-transparent outline-none resize-none transition-all text-gray-800 leading-relaxed text-[15px]"
        />

        <div className="flex justify-end pt-2">
          <button 
            onClick={handleSave} 
            disabled={status === 'saving' || content.trim() === ''}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors w-full sm:w-auto"
          >
            {status === 'saving' ? '클라우드 저장 중...' : '기록 완료'}
          </button>
        </div>
        {saveError && <p className="text-sm text-amber-700 text-right">{saveError}</p>}
      </div>
    </div>
  );
}
