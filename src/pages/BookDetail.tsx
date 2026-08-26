import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Edit2, 
  PlayCircle, 
  X, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Clock, 
  Send,
  MessageCircle,
  PenLine
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/contexts/DataContext';
import { BookCover } from '@/components/common/BookCover';
import { getRandomBookQuestion } from '@/lib/questions';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  author: string;
  content: string;
  question?: string;
  user1Thought?: string;
  user2Thought?: string;
  createdAt?: string;
}

export interface StoredBookDiscussion {
  id: string;
  bookId: string;
  user1Thought?: string;
  user2Thought?: string;
  sharedSummary?: string;
  reflections?: TimelineEntry[];
  updatedAt?: string;
}

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, partner, spaceId } = useAuth();
  const { books, deleteBook, setCurrentBook, updateBook } = useData();
  
  const book = books.find(b => b.id === id);

  // Status edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<any>(book?.status || 'planned');
  const [editFinishedAt, setEditFinishedAt] = useState(book?.completedAt?.substring(0, 10) || '');

  // Persistent Firestore thought & discussion data
  const [storedData, setStoredData] = useState<StoredBookDiscussion | null>(null);

  // Editing direct user thought card (for current logged in user)
  const [isEditingMyThought, setIsEditingMyThought] = useState(false);
  const [myThoughtInput, setMyThoughtInput] = useState('');
  const [isSavingMyThought, setIsSavingMyThought] = useState(false);

  // Dynamic Random Question
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState(false);

  // Reflection input state
  const [reflectionInput, setReflectionInput] = useState('');
  const [isSavingReflection, setIsSavingReflection] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Timeline toggle state (기본: 열림)
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  // Name representations: dynamically reflect the partner's real nickname
  const user1Name = user?.nickname || user?.displayName || "민아";
  const user2Name = partner?.nickname || partner?.displayName || "파트너";

  // Initialize random question on book load
  useEffect(() => {
    if (book) {
      setCurrentQuestion(getRandomBookQuestion(book.title, book.author));
    }
  }, [book?.id, book?.title, book?.author]);

  // Pick a fresh random question
  const handleShuffleQuestion = useCallback(() => {
    if (!book) return;
    setIsSpinning(true);
    const nextQ = getRandomBookQuestion(book.title, book.author, currentQuestion);
    setCurrentQuestion(nextQ);
    setTimeout(() => setIsSpinning(false), 400);
  }, [book, currentQuestion]);

  // Firestore real-time listener for this book's thoughts and reflections
  useEffect(() => {
    if (!spaceId || !book) return;

    const discDocRef = doc(db, 'spaces', spaceId, 'discussions', book.id);
    const unsubscribe = onSnapshot(discDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as StoredBookDiscussion;
        setStoredData(data);
      } else {
        setStoredData(null);
      }
    });

    return () => unsubscribe();
  }, [spaceId, book?.id]);

  if (!book || book.deletedAt) {
    return <div className="p-8 text-center text-gray-500">책을 찾을 수 없습니다.</div>;
  }

  // Active Thoughts: Purely from saved data (no fake mock text)
  const activeUser1Thought = storedData?.user1Thought || '';
  const activeUser2Thought = storedData?.user2Thought || '';
  const activeSharedSummary = storedData?.sharedSummary || '';

  const handleDelete = () => {
    if (window.confirm('이 책을 서재에서 삭제하여 휴지통으로 이동하시겠습니까?')) {
      deleteBook(book.id);
      navigate('/library');
    }
  };

  const handleSetCurrent = () => {
    if (window.confirm('이 책을 현재 읽고 있는 책으로 설정하시겠습니까?')) {
      setCurrentBook(book.id);
    }
  };

  const handleSaveEdit = () => {
    updateBook(book.id, {
      status: editStatus,
      completedAt: editStatus === 'completed' && editFinishedAt ? new Date(editFinishedAt).toISOString() : undefined,
    });
    setIsEditModalOpen(false);
  };

  // Save / Update User's thought on the card
  const handleSaveMyThought = async () => {
    if (!book) return;
    setIsSavingMyThought(true);

    const updatedDoc: StoredBookDiscussion = {
      id: book.id,
      bookId: book.id,
      user1Thought: myThoughtInput.trim(),
      user2Thought: activeUser2Thought,
      sharedSummary: activeSharedSummary,
      reflections: storedData?.reflections || [],
      updatedAt: new Date().toISOString()
    };

    if (spaceId) {
      try {
        await setDoc(doc(db, 'spaces', spaceId, 'discussions', book.id), updatedDoc);
        setIsEditingMyThought(false);
        setSaveSuccessMessage('내 사유가 성공적으로 저장되었습니다.');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      } catch (err) {
        console.error("Error saving user thought:", err);
      } finally {
        setIsSavingMyThought(false);
      }
    } else {
      setStoredData(updatedDoc);
      setIsEditingMyThought(false);
      setIsSavingMyThought(false);
      setSaveSuccessMessage('내 사유가 성공적으로 저장되었습니다.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  // Add new reflection entry to timeline and Firestore
  const handleAddReflection = async () => {
    if (!reflectionInput.trim() || !book) return;

    setIsSavingReflection(true);
    const newEntry: TimelineEntry = {
      id: 'ref_' + Date.now().toString(),
      date: new Date().toLocaleDateString('ko-KR'),
      title: '새로운 사유 기록',
      author: user1Name,
      question: currentQuestion,
      content: reflectionInput.trim(),
      user1Thought: reflectionInput.trim(),
      createdAt: new Date().toISOString()
    };

    const existingReflections = storedData?.reflections || [];
    const updatedReflections = [...existingReflections, newEntry];

    // If user1Thought on the top card was empty, also fill it with this first deep thought
    const newUser1Thought = activeUser1Thought ? activeUser1Thought : reflectionInput.trim();

    const updatedDoc: StoredBookDiscussion = {
      id: book.id,
      bookId: book.id,
      user1Thought: newUser1Thought,
      user2Thought: activeUser2Thought,
      sharedSummary: activeSharedSummary,
      reflections: updatedReflections,
      updatedAt: new Date().toISOString()
    };

    if (spaceId) {
      try {
        await setDoc(doc(db, 'spaces', spaceId, 'discussions', book.id), updatedDoc);
        setReflectionInput('');
        setSaveSuccessMessage('새로운 사유가 연대표에 성공적으로 추가되었습니다.');
        setIsTimelineOpen(true);
        // Shuffle to a new question for the next thought
        handleShuffleQuestion();
        setTimeout(() => setSaveSuccessMessage(null), 3500);
      } catch (err) {
        console.error("Error saving reflection:", err);
      } finally {
        setIsSavingReflection(false);
      }
    } else {
      setStoredData(updatedDoc);
      setReflectionInput('');
      setSaveSuccessMessage('새로운 사유가 연대표에 성공적으로 추가되었습니다.');
      setIsTimelineOpen(true);
      setIsSavingReflection(false);
      handleShuffleQuestion();
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    }
  };

  // Timeline list (only real records)
  const timelineEntries: TimelineEntry[] = storedData?.reflections || [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 space-y-12 pb-28">
      {/* 1. Header & Navigation */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Link to="/library" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-900 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            라이브러리
          </Link>
          <div className="flex items-center gap-4">
            {book.status !== 'reading' && (
              <button 
                onClick={handleSetCurrent}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <PlayCircle className="w-4 h-4 mr-1" />
                현재 책으로 설정
              </button>
            )}
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              상태 편집
            </button>
            <button 
              onClick={handleDelete}
              className="inline-flex items-center text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              삭제
            </button>
          </div>
        </div>
        
        {/* Book Info */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-10 border-b border-gray-100/70 gap-6">
          <div className="flex gap-6 items-end">
            <BookCover
              title={book.title}
              author={book.author}
              coverImage={book.coverImage}
              isbn={book.isbn}
              size="lg"
              className="w-24 h-36 shrink-0 shadow-sm"
            />
            <div className="space-y-2.5 pb-1">
              <h1 className="text-2xl md:text-3xl font-medium text-gray-900 tracking-tight">
                {book.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 font-light">
                <span className="text-gray-600">{book.author}</span>
                <span>·</span>
                <span>
                  {book.status === 'reading' && '읽는 중'}
                  {book.status === 'planned' && '읽기 예정'}
                  {book.status === 'completed' && book.completedAt && `완독 (${new Date(book.completedAt).toLocaleDateString('ko-KR')})`}
                  {book.status === 'completed' && !book.completedAt && `완독`}
                </span>
                {book.publisher && (
                  <>
                    <span>·</span>
                    <span>{book.publisher}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 이 책에 대한 생각 (2인 비교: 사용자 | 파트너) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gray-700" />
          <h2 className="text-sm font-medium text-gray-900 tracking-wide">
            이 책에 대한 생각
          </h2>
        </div>

        {/* 2-Column Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* User 1 Card (나) */}
          <div className="bg-[#FAFAFA] rounded-2xl p-7 border border-gray-100/90 flex flex-col justify-between space-y-4 shadow-sm min-h-[170px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/50">
                <span className="text-xs font-semibold text-gray-800 tracking-wide">{user1Name}</span>
                {!isEditingMyThought && (
                  <button
                    onClick={() => {
                      setMyThoughtInput(activeUser1Thought);
                      setIsEditingMyThought(true);
                    }}
                    className="text-[11px] text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors"
                  >
                    <PenLine className="w-3 h-3" />
                    <span>{activeUser1Thought ? '수정' : '작성'}</span>
                  </button>
                )}
              </div>

              {isEditingMyThought ? (
                <div className="space-y-3 pt-1">
                  <textarea
                    value={myThoughtInput}
                    onChange={(e) => setMyThoughtInput(e.target.value)}
                    placeholder="이 책을 읽고 나에게 일어난 생각의 변화나 사유를 자유롭게 적어보세요."
                    className="w-full h-28 p-3 bg-white rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none text-sm text-gray-800 leading-relaxed resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingMyThought(false)}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200/60 rounded-md transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveMyThought}
                      disabled={isSavingMyThought}
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors"
                    >
                      {isSavingMyThought ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              ) : activeUser1Thought ? (
                <p className="text-gray-800 leading-relaxed text-[14.5px] whitespace-pre-wrap">
                  {activeUser1Thought}
                </p>
              ) : (
                <div 
                  onClick={() => {
                    setMyThoughtInput('');
                    setIsEditingMyThought(true);
                  }}
                  className="py-6 text-center cursor-pointer group"
                >
                  <p className="text-xs text-gray-400 group-hover:text-gray-700 transition-colors">
                    아직 기록된 사유가 없습니다. 클릭하여 생각을 남겨보세요.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* User 2 Card (파트너) */}
          <div className="bg-[#FAFAFA] rounded-2xl p-7 border border-gray-100/90 flex flex-col justify-between space-y-4 shadow-sm min-h-[170px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/50">
                <span className="text-xs font-semibold text-gray-800 tracking-wide">{user2Name}</span>
                <span className="text-[11px] text-gray-400">파트너</span>
              </div>

              {activeUser2Thought ? (
                <p className="text-gray-800 leading-relaxed text-[14.5px] whitespace-pre-wrap">
                  {activeUser2Thought}
                </p>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-gray-400 font-light">
                    {partner?.nickname 
                      ? `${partner.nickname} 님의 사유가 아직 등록되지 않았습니다.` 
                      : '상대방이 초대 코드로 입장하면 파트너의 사유가 이곳에 표시됩니다.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shared Summary (Only shown if recorded) */}
        {activeSharedSummary && (
          <div className="max-w-3xl mx-auto text-center pt-2 pb-4 space-y-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">함께 나눈 중심 사유</span>
            <p className="text-gray-800 text-[15px] leading-relaxed break-keep font-light">
              "{activeSharedSummary}"
            </p>
          </div>
        )}
      </div>

      {/* 3. 계속 떠오를 때마다 추가할 수 있는 영역 (AI 질문 + 추가 적는 칸) */}
      <div className="pt-6 border-t border-gray-100 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-700" />
            <h2 className="text-sm font-medium text-gray-900 tracking-wide">
              계속 떠오르는 사유 추가하기
            </h2>
          </div>
          <button
            onClick={handleShuffleQuestion}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200/60 transition-colors shadow-2xs"
            title="다른 질문 보기"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isSpinning ? 'rotate-180 duration-300' : ''}`} />
            <span>다른 질문 추천</span>
          </button>
        </div>

        {/* AI Question Box */}
        <div className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-4 sm:p-5 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 text-amber-700 text-xs font-medium">
            Q
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-amber-800/80">AI가 건네는 질문</span>
            <p className="text-gray-900 text-sm font-medium leading-relaxed break-keep">
              {currentQuestion || "이 책을 읽고 난 후 가장 크게 바뀐 생각이나 일상의 태도는 무엇인가요?"}
            </p>
          </div>
        </div>

        {/* Input Textarea & Save */}
        <div className="space-y-3">
          <textarea
            value={reflectionInput}
            onChange={(e) => setReflectionInput(e.target.value)}
            placeholder="시간이 지난 지금 문득 떠오른 생각, 일상에서 이 책과 연결된 순간, 다시 짚어보고 싶은 문장을 기록해보세요."
            className="w-full h-32 p-4 bg-[#FAFAFA] focus:bg-white rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none text-sm text-gray-800 leading-relaxed resize-none transition-all placeholder:text-gray-400"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">
              추가된 사유는 아래 '생각 변화 연대표'에 날짜와 함께 누적 기록됩니다.
            </span>
            <button
              onClick={handleAddReflection}
              disabled={isSavingReflection || !reflectionInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-xs font-medium rounded-lg transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSavingReflection ? '저장 중...' : '사유 기록 추가'}</span>
            </button>
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-1.5 animate-in fade-in duration-200">
            <Check className="w-4 h-4" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* 4. 생각 변화 연대표 (토글로 열고 닫는 형태) */}
      <div className="pt-6 border-t border-gray-100 space-y-6">
        <div 
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
          className="flex items-center justify-between cursor-pointer py-2 group select-none"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-700" />
            <h2 className="text-sm font-medium text-gray-900 tracking-wide">
              생각 변화 연대표 ({timelineEntries.length}개의 기록)
            </h2>
          </div>
          <button className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-900 transition-colors">
            <span>{isTimelineOpen ? '연대표 접기' : '연대표 펼치기'}</span>
            {isTimelineOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Timeline Content (Toggled) */}
        {isTimelineOpen && (
          <div className="space-y-6">
            {timelineEntries.length > 0 ? (
              <div className="space-y-8 pl-4 sm:pl-6 border-l-2 border-gray-100/90 ml-2 animate-in fade-in duration-300">
                {timelineEntries.map((item, index) => {
                  const isRecent = index === timelineEntries.length - 1;
                  return (
                    <div key={item.id || `tl_${index}`} className="relative pl-6 space-y-3 group">
                      {/* Dot */}
                      <div className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 bg-white ${
                        isRecent ? 'border-amber-500 ring-2 ring-amber-100' : 'border-gray-900'
                      }`} />

                      {/* Header info */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900">{item.title}</span>
                          <span className="text-xs text-gray-400">· {item.author}</span>
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums font-mono">{item.date}</span>
                      </div>

                      {/* Question context if this is a reflection */}
                      {item.question && (
                        <div className="text-xs text-amber-800 bg-amber-50/60 rounded-lg px-3 py-2 border border-amber-100 font-medium">
                          💡 질문: {item.question}
                        </div>
                      )}

                      {/* Content card */}
                      <div className="bg-[#FAFAFA] rounded-xl p-5 border border-gray-100 space-y-3 text-[14.5px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#FAFAFA] rounded-2xl border border-gray-100/80">
                <p className="text-xs text-gray-400">
                  아직 누적된 연대표 기록이 없습니다. 위의 질문에 답하여 첫 번째 사유를 남겨보세요.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Status Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">책 상태 편집</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">상태</label>
                <select 
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-gray-900 text-sm"
                >
                  <option value="reading">읽는 중</option>
                  <option value="completed">완독</option>
                  <option value="planned">읽기 예정</option>
                </select>
              </div>

              {editStatus === 'completed' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">완독 날짜</label>
                  <input 
                    type="date" 
                    value={editFinishedAt}
                    onChange={e => setEditFinishedAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-gray-900 text-sm"
                  />
                </div>
              )}
            </div>

            <button 
              onClick={handleSaveEdit}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
