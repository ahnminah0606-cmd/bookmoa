import { useState } from 'react';
import type { Book } from '@/types';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { quoteBookKey } from '@/lib/bookQuotes';

export default function BookQuoteEditor({ book }: { book: Book }) {
  const { spaceId } = useAuth();
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const save = async () => {
    setMessage('');
    if (!spaceId) { setMessage('로그인이 필요해요.'); return; }
    if (!text.trim()) { setMessage('저장할 문장을 넣어 주세요.'); return; }
    if (url.trim()) {
      try { if (new URL(url.trim()).protocol !== 'https:') throw new Error(); }
      catch { setMessage('출처는 https://로 시작하는 주소를 넣어 주세요.'); return; }
    }
    const existing = book.quoteLookup?.key === quoteBookKey(book) ? book.quoteLookup.quotes : [];
    if (existing.some(quote => quote.text === text.trim())) { setMessage('이미 저장한 문장이에요.'); return; }
    setBusy(true);
    try {
      const ref = doc(db, 'spaces', spaceId, 'books', book.id);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('Book not found');
        const latest = snapshot.data() as Book;
        if (latest.deletedAt || quoteBookKey(latest) !== quoteBookKey(book)) throw new Error('Book changed');
        const quotes = latest.quoteLookup?.key === quoteBookKey(latest) ? latest.quoteLookup.quotes : [];
        if (quotes.some(quote => quote.text === text.trim())) return;
        transaction.update(ref, { quoteLookup: { key: quoteBookKey(latest), status: 'ready', checkedAt: new Date().toISOString(), quotes: [...quotes, { text: text.trim(), sourceUrl: url.trim(), sourceTitle: '직접 추가한 문장' }] } });
      });
      setText(''); setUrl(''); setMessage('AI 호출 없이 저장했어요. 홈에서 다른 책들과 함께 보여요.');
    } catch { setMessage('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  const toggle = async (quoteText: string, hidden: boolean) => {
    if (!spaceId || busy) return;
    setBusy(true); setMessage('');
    try {
      const ref = doc(db, 'spaces', spaceId, 'books', book.id);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('Book not found');
        const latest = snapshot.data() as Book;
        if (!latest.quoteLookup || quoteBookKey(latest) !== quoteBookKey(book)) throw new Error('Book changed');
        transaction.update(ref, { quoteLookup: { ...latest.quoteLookup, quotes: latest.quoteLookup.quotes.map(quote => quote.text === quoteText ? { ...quote, hidden } : quote) } });
      });
      setMessage(hidden ? '홈에서 제외했어요. 아래 보관한 문장에서 복구할 수 있어요.' : '홈에 다시 표시합니다.');
    } catch { setMessage('변경하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  const quotes = book.quoteLookup?.key === quoteBookKey(book) ? book.quoteLookup.quotes : [];
  return <details className="rounded-xl border border-gray-100 p-4 text-sm">
    <summary className="cursor-pointer text-gray-600">홈 명문장 추가</summary>
    <div className="mt-4 space-y-3">
      <p className="text-xs text-gray-500">GPT에서 찾은 실제 책 속 문장을 넣어 주세요. 자동 검색이나 AI 호출 없이 저장합니다. 출처는 내부에 보관해요.</p>
      <label className="block">문장<textarea aria-label="홈에 표시할 명문장" disabled={busy} maxLength={500} value={text} onChange={event => setText(event.target.value)} className="mt-1 min-h-24 w-full rounded border p-2" /></label>
      <label className="block">출처 주소 (선택)<input type="url" disabled={busy} value={url} onChange={event => setUrl(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <button type="button" onClick={() => void save()} disabled={busy} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-40">{busy ? '저장 중' : '문장 저장'}</button>
      <ul className="space-y-2">{quotes.filter(quote => !quote.hidden).map(quote => <li key={quote.text} className="flex items-start justify-between gap-3 border-t pt-2"><span className="whitespace-pre-wrap">{quote.text}</span><button type="button" disabled={busy} onClick={() => void toggle(quote.text, true)} className="shrink-0 text-xs text-gray-400">홈에서 제외</button></li>)}</ul>
      {quotes.some(quote => quote.hidden) && <details><summary className="cursor-pointer text-xs text-gray-400">보관한 문장</summary><ul className="mt-2 space-y-2">{quotes.filter(quote => quote.hidden).map(quote => <li key={quote.text} className="flex items-start justify-between gap-3"><span>{quote.text}</span><button type="button" disabled={busy} onClick={() => void toggle(quote.text, false)} className="text-xs text-gray-500">복구</button></li>)}</ul></details>}
      {message && <p role="status" className="text-xs text-gray-500">{message}</p>}
    </div>
  </details>;
}
