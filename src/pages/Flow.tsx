import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, LoaderCircle, RotateCcw } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import type { ThoughtFlowCurrent, ThoughtFlowHistory } from '@/types';

const PAGE_SIZE = 10;
type FlowDecision = 'initialize' | 'update' | 'rewrite' | 'unchanged';

interface FlowSourceRecord {
  bookTitle: string;
  authorName: string;
  content: string;
  updatedAt: string;
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function formatPeriod(startAt?: string, endAt?: string) {
  if (!startAt) return '';
  return `${formatDate(startAt)} — ${endAt ? formatDate(endAt) : '현재'}`;
}

function normalizeParagraphs(summary: string) {
  return summary.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export default function Flow() {
  const { user, partner, spaceId } = useAuth();
  const { books } = useData();
  const [current, setCurrent] = useState<ThoughtFlowCurrent | null>(null);
  const [history, setHistory] = useState<ThoughtFlowHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ThoughtFlowHistory | null>(null);
  const [page, setPage] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const analysisKeyRef = useRef('');

  const memberNames = useMemo(() => [
    user?.nickname || user?.displayName || '나',
    partner?.nickname || partner?.displayName || '파트너',
  ], [user?.nickname, user?.displayName, partner?.nickname, partner?.displayName]);

  useEffect(() => {
    if (!spaceId) return;
    const currentRef = doc(db, 'spaces', spaceId, 'flow', 'current');
    const historyRef = query(collection(db, 'spaces', spaceId, 'flowHistory'), orderBy('createdAt', 'asc'));
    const unsubscribeCurrent = onSnapshot(currentRef, (snapshot) => {
      setCurrent(snapshot.exists() ? snapshot.data() as ThoughtFlowCurrent : null);
    });
    const unsubscribeHistory = onSnapshot(historyRef, (snapshot) => {
      setHistory(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ThoughtFlowHistory[]);
    });
    return () => {
      unsubscribeCurrent();
      unsubscribeHistory();
    };
  }, [spaceId]);

  useEffect(() => {
    if (!spaceId || isAnalyzing) return;

    const analyze = async () => {
      const snapshot = await getDocs(collection(db, 'spaces', spaceId, 'discussions'));
      const records: FlowSourceRecord[] = [];

      snapshot.forEach((discussionDoc) => {
        const data = discussionDoc.data() as any;
        const bookTitle = books.find((book) => book.id === data.bookId)?.title || '제목 없음';
        const updatedAt = data.updatedAt || '';
        const fallbackAuthor = typeof data.updatedBy === 'string' ? data.updatedBy : memberNames[0];

        if (typeof data.content === 'string' && data.content.trim()) {
          records.push({ bookTitle, authorName: fallbackAuthor, content: data.content.trim(), updatedAt });
        } else {
          if (typeof data.user1Thought === 'string' && data.user1Thought.trim()) {
            records.push({ bookTitle, authorName: fallbackAuthor, content: data.user1Thought.trim(), updatedAt });
          }
          if (typeof data.user2Thought === 'string' && data.user2Thought.trim() && !data.user2Thought.includes('기다리는 중')) {
            records.push({ bookTitle, authorName: memberNames[1], content: data.user2Thought.trim(), updatedAt });
          }
        }

        if (Array.isArray(data.reflections)) {
          data.reflections.forEach((reflection: any) => {
            if (typeof reflection.content === 'string' && reflection.content.trim()) {
              records.push({
                bookTitle,
                authorName: typeof reflection.author === 'string' ? reflection.author : fallbackAuthor,
                content: reflection.content.trim(),
                updatedAt: reflection.createdAt || updatedAt,
              });
            }
          });
        }
      });

      records.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      const latestSourceAt = records.at(-1)?.updatedAt || '';
      const analysisKey = `${latestSourceAt}:${records.length}:${current?.analyzedThrough || ''}`;
      if (!records.length || current?.analyzedThrough === latestSourceAt || analysisKeyRef.current === analysisKey) return;

      analysisKeyRef.current = analysisKey;
      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const changedRecords = current?.analyzedThrough
          ? records.filter((record) => record.updatedAt > current.analyzedThrough)
          : records;
        const inputRecords = changedRecords.length ? changedRecords : records.slice(-5);
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error('로그인이 필요합니다.');

        const response = await fetch('/api/flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ currentSummary: current?.summary || '', records: inputRecords, memberNames }),
        });
        const result = await response.json() as { decision?: FlowDecision; summary?: string; error?: string };
        if (!response.ok || !result.decision || !result.summary) {
          throw new Error(result.error || '생각의 흐름을 정리하지 못했습니다.');
        }

        const now = new Date().toISOString();
        const currentRef = doc(db, 'spaces', spaceId, 'flow', 'current');
        if (result.decision === 'rewrite' && current?.summary) {
          const batch = writeBatch(db);
          const historyRef = doc(collection(db, 'spaces', spaceId, 'flowHistory'));
          batch.set(historyRef, { summary: current.summary, startAt: current.startAt, endAt: now, createdAt: now });
          batch.set(currentRef, { summary: result.summary, startAt: now, updatedAt: now, analyzedThrough: latestSourceAt });
          await batch.commit();
        } else {
          await setDoc(currentRef, {
            summary: result.decision === 'unchanged' && current?.summary ? current.summary : result.summary,
            startAt: current?.startAt || now,
            updatedAt: now,
            analyzedThrough: latestSourceAt,
          });
        }
      } catch (error) {
        console.error('Thought flow analysis error:', error);
        setAnalysisError(error instanceof Error ? error.message : '생각의 흐름을 정리하지 못했습니다.');
      } finally {
        setIsAnalyzing(false);
      }
    };

    void analyze();
  }, [spaceId, books, current, isAnalyzing, memberNames]);

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const pageItems = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const slots = Array.from({ length: PAGE_SIZE }, (_, index) => pageItems[index] || null);
  const displayed = selectedHistory
    ? { summary: selectedHistory.summary, startAt: selectedHistory.startAt, endAt: selectedHistory.endAt }
    : current ? { summary: current.summary, startAt: current.startAt, endAt: undefined } : null;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 pb-24 md:px-8">
      <div className="space-y-4 border-b border-gray-100/60 pb-10">
        <h1 className="text-2xl font-medium tracking-tight text-gray-900 md:text-3xl">생각의 흐름</h1>
        <p className="text-[15px] font-light leading-relaxed text-gray-400">
          기록이 쌓이면 두 사람의 시선이 더해지고 달라진 과정을 AI가 조용히 정리합니다.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex min-h-6 items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-400">{selectedHistory ? '지난 생각의 흐름' : '현재 생각의 흐름'}</p>
            {displayed && <p className="mt-1 text-xs tabular-nums text-gray-400">{formatPeriod(displayed.startAt, displayed.endAt)}</p>}
          </div>
          {selectedHistory && (
            <button type="button" onClick={() => setSelectedHistory(null)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900">
              <RotateCcw className="h-3.5 w-3.5" />현재로 돌아가기
            </button>
          )}
        </div>

        <div className="min-h-[250px] rounded-2xl border border-gray-100 bg-[#FAFAFA] p-6 sm:p-9">
          {displayed ? (
            <div className="space-y-5">
              {normalizeParagraphs(displayed.summary).map((paragraph, index) => (
                <p key={index} className="break-keep text-[15px] font-light leading-8 text-gray-800">{paragraph}</p>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[176px] flex-col items-center justify-center text-center">
              {isAnalyzing ? (
                <><LoaderCircle className="mb-3 h-5 w-5 animate-spin text-gray-300" /><p className="text-sm text-gray-400">첫 생각의 흐름을 정리하고 있습니다.</p></>
              ) : (
                <><p className="text-sm text-gray-500">아직 정리된 생각의 흐름이 없습니다.</p><p className="mt-2 text-xs font-light text-gray-400">책에서 떠오른 생각을 기록하면 이곳에 자연스럽게 채워집니다.</p></>
              )}
            </div>
          )}
        </div>
        {isAnalyzing && displayed && <p className="flex items-center justify-end gap-1.5 text-xs text-gray-400"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />새 기록을 현재 흐름에 반영하고 있습니다.</p>}
        {analysisError && <p className="text-right text-xs text-amber-700">{analysisError}</p>}
      </section>

      <section className="space-y-4 border-t border-gray-100/60 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="text-sm font-medium text-gray-700">지난 생각의 흐름</h2><p className="mt-1 text-xs font-light text-gray-400">생각의 중심이 크게 달라졌던 순간만 보관됩니다.</p></div>
          <span className="text-xs tabular-nums text-gray-400">{history.length}개의 기록</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100">
          {slots.map((item, slotIndex) => {
            const number = (page - 1) * PAGE_SIZE + slotIndex + 1;
            return (
              <button type="button" key={item?.id || `empty-${number}`} disabled={!item} onClick={() => item && setSelectedHistory(item)} className="flex h-11 w-full items-center border-b border-gray-100 px-4 text-left text-sm last:border-b-0 enabled:hover:bg-gray-50 disabled:cursor-default">
                <span className="w-10 shrink-0 text-xs tabular-nums text-gray-400">{String(number).padStart(2, '0')}</span>
                <span className={item ? 'text-gray-700' : 'text-gray-200'}>{item ? formatPeriod(item.startAt, item.endAt) : '—'}</span>
              </button>
            );
          })}
        </div>

        {totalPages > 1 && (
          <nav aria-label="지난 생각의 흐름 페이지" className="flex items-center justify-center gap-1 pt-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-md p-2 text-gray-400 hover:bg-gray-50 disabled:text-gray-200"><ChevronLeft className="h-4 w-4" /></button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button type="button" key={pageNumber} onClick={() => setPage(pageNumber)} className={`h-8 min-w-8 rounded-md px-2 text-xs ${page === pageNumber ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{pageNumber}</button>
            ))}
            <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md p-2 text-gray-400 hover:bg-gray-50 disabled:text-gray-200"><ChevronRight className="h-4 w-4" /></button>
          </nav>
        )}
      </section>
    </div>
  );
}
