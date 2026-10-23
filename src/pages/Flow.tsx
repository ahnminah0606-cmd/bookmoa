import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, LoaderCircle, ChevronDown } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import type { ThoughtFlowCurrent, ThoughtFlowHistory } from '@/types';
import FlowImport from '@/components/flow/FlowImport';
import { sortFlowTimeline, formatEventDate, latestThought, timelineTitle, compactPeriod } from '@/lib/flowTimeline';

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
  const [openEntries, setOpenEntries] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const analysisKeyRef = useRef('');
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<{ item: ThoughtFlowHistory; name: string; requestId: string } | null>(null);

  const memberNames = useMemo(() => [
    user?.nickname || user?.displayName || '나',
    partner?.nickname || partner?.displayName || '파트너',
  ], [user?.nickname, user?.displayName, partner?.nickname, partner?.displayName]);

  useEffect(() => {
    if (!spaceId) return;
    const currentRef = doc(db, 'spaces', spaceId, 'flow', 'current');
    setCurrent(null); setHistory([]); setOpenEntries(new Set()); setPage(1);
    const historyRef = collection(db, 'spaces', spaceId, 'flowHistory');
    const unsubscribeCurrent = onSnapshot(currentRef, (snapshot) => {
      setCurrent(snapshot.exists() ? snapshot.data() as ThoughtFlowCurrent : null);
    });
    const unsubscribeHistory = onSnapshot(historyRef, (snapshot) => {
      setHistory(sortFlowTimeline(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })) as ThoughtFlowHistory[]));
    });
    return () => {
      unsubscribeCurrent();
      unsubscribeHistory();
    };
  }, [spaceId]);

  useEffect(() => {
    if (!pendingSelection) return;
    const index = history.findIndex(item => item.id === pendingSelection);
    if (index < 0) return;
    setPage(Math.floor(index / PAGE_SIZE) + 1);
    setOpenEntries(new Set());
    setPendingSelection(null);
  }, [history, pendingSelection]);

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
  const displayed = latestThought(history, current);
  const toggleEntry = (id: string) => setOpenEntries(previous => {
    const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 pb-24 md:px-8">
      <div className="space-y-4 border-b border-gray-100/60 pb-10">
        <h1 className="text-2xl font-medium tracking-tight text-gray-900 md:text-3xl">생각의 흐름</h1>
        <p className="text-[15px] font-light leading-relaxed text-gray-400">
          무엇을 의심하고, 무엇을 중요하게 여기는지. 두 사람의 생각이 이어지고 달라지는 과정을 모읍니다.
        </p>
      </div>

      <div key={spaceId || 'no-space'}><FlowImport history={history} onSaved={setPendingSelection} assignment={assignment} /></div>

      <section className="space-y-4">
        <p className="text-xs font-medium text-gray-400">현재</p>
        <div className="min-h-[250px] rounded-2xl border border-gray-100 bg-[#FAFAFA] p-6 sm:p-9">
          {displayed ? (
            <div className="space-y-5">
              {normalizeParagraphs(displayed.summary).map((paragraph, index) => (
                <p key={index} className="break-keep text-[15px] font-light leading-8 text-gray-800">{paragraph}</p>
              ))}
              <p className="text-right text-xs tabular-nums text-gray-400">{compactPeriod(displayed.eventDate || displayed.startAt, displayed.endAt)}</p>
            </div>
          ) : (
            <div className="flex min-h-[176px] flex-col items-center justify-center text-center">
              {isAnalyzing ? (
                <><LoaderCircle className="mb-3 h-5 w-5 animate-spin text-gray-300" /><p className="text-sm text-gray-400">첫 생각의 흐름을 정리하고 있습니다.</p></>
              ) : (
                <><p className="text-sm text-gray-500">아직 정리된 생각이 없습니다.</p><p className="mt-2 text-xs font-light text-gray-400">자료를 추가하면 가장 최근 시기의 생각이 이곳에 정리됩니다.</p></>
              )}
            </div>
          )}
        </div>
        {isAnalyzing && displayed && <p className="flex items-center justify-end gap-1.5 text-xs text-gray-400"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />새 기록을 현재 흐름에 반영하고 있습니다.</p>}
        {analysisError && <p className="text-right text-xs text-amber-700">{analysisError}</p>}
      </section>

      <section className="space-y-4 border-t border-gray-100/60 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="text-sm font-medium text-gray-700">전환점</h2><p className="mt-1 text-xs font-light leading-5 text-gray-400">자료 속 시기와 생각의 변화 순으로 모았어요. 뒤늦게 추가한 기록도 제자리를 찾아갑니다.</p></div>
          <span className="text-xs tabular-nums text-gray-400">{history.length}개의 기록</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100">
          {slots.map((item, slotIndex) => {
            const number = (page - 1) * PAGE_SIZE + slotIndex + 1;
            return (
              <div key={item?.id || `empty-${number}`} className="border-b border-gray-100 last:border-b-0">
                <button type="button" disabled={!item} aria-expanded={item ? openEntries.has(item.id) : undefined} aria-controls={item ? `thought-${item.id}` : undefined} onClick={() => item && toggleEntry(item.id)} className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left text-sm enabled:hover:bg-gray-50 disabled:cursor-default">
                  <span className="w-8 shrink-0 text-xs tabular-nums text-gray-400">{String(number).padStart(2, '0')}</span>
                  <span className={item ? 'min-w-0 flex-1 truncate text-gray-700' : 'text-gray-200'}>{item ? timelineTitle(item) : '—'}</span>
                  {item && <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform ${openEntries.has(item.id) ? 'rotate-180' : ''}`} />}
                </button>
                {item && openEntries.has(item.id) && <div id={`thought-${item.id}`} className="space-y-4 border-t border-gray-100 bg-gray-50/50 px-5 py-5 sm:pl-14">
                  {item.kind === 'import' && !item.thoughts?.length && <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500"><span>누구의 글인지 선택해 다시 정리할 수 있어요.</span>{['민아', '성모'].map(name => <button type="button" key={name} onClick={() => setAssignment({ item, name, requestId: crypto.randomUUID() })} className="rounded-full border border-gray-200 bg-white px-3 py-1.5">{name}의 글</button>)}</div>}
                  {item.kind === 'import' && item.thoughts?.some(person => ['민아', '성모'].includes(person.name)) && <button type="button" onClick={() => setAssignment({ item, name: item.thoughts!.map(person => person.name).filter(name => ['민아', '성모'].includes(name)).join(', '), requestId: crypto.randomUUID() })} className="text-xs text-gray-400 underline underline-offset-4">생각 중심으로 다시 정리</button>}
                  {normalizeParagraphs(item.summary).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-800">{paragraph}</p>)}
                  <p className="text-right text-xs tabular-nums text-gray-400">{compactPeriod(item.eventDate || item.startAt, item.endAt)}</p>
                </div>}
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <nav aria-label="전환점 페이지" className="flex items-center justify-center gap-1 pt-2">
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
