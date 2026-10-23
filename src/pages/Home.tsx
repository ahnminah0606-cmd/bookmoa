import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { getSavedQuotes, quoteBookKey } from '@/lib/bookQuotes';
import { Sparkles, RefreshCw, ExternalLink } from 'lucide-react';

export default function Home() {
  const { books, isLoading, quoteSearchBookId, retryBookQuotes, quoteStorageError } = useData();
  const quotes = useMemo(() => getSavedQuotes(books), [books]);
  const [selected, setSelected] = useState(0);
  const [retryError, setRetryError] = useState('');
  const quote = quotes[selected % Math.max(quotes.length, 1)];
  const quoteListKey = JSON.stringify(quotes.map(quote => [quote.bookId, quote.text]));

  useEffect(() => {
    setSelected(Math.floor(Math.random() * Math.max(quotes.length, 1)));
  }, [quoteListKey]);

  const pickRandomQuote = () => {
    if (quotes.length < 2) return;
    const offset = 1 + Math.floor(Math.random() * (quotes.length - 1));
    setSelected(index => (index + offset) % quotes.length);
  };
  const unavailableBooks = books.filter(book => !book.deletedAt
    && book.quoteLookup?.key === quoteBookKey(book) && book.quoteLookup.status !== 'ready');
  const retry = async (id: string) => {
    setRetryError('');
    try { await retryBookQuotes(id); } catch { setRetryError('다시 시도하지 못했습니다. 잠시 후 다시 눌러 주세요.'); }
  };

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center px-5 py-12 text-center bg-white sm:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {quote ? (
          <div className="space-y-4">
            <button type="button" onClick={pickRandomQuote} className="w-full space-y-4 group" aria-label="저장된 다른 명문장 보기">
              <div className="text-sm text-gray-400 font-medium tracking-wider">{quote.bookTitle}</div>
              <p className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed break-keep">“{quote.text}”</p>
              <div className="pt-2 flex items-start justify-center gap-1.5 text-[11px] leading-relaxed text-gray-400">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>서재에 저장된 책 속 문장{quotes.length > 1 ? ' · 클릭하여 다른 문장 보기' : ''}</span>
              </div>
            </button>
            <a href={quote.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 underline underline-offset-4">
              {quote.sourceTitle}<ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        ) : (
          <div className="space-y-3" role="status">
            <p className="text-xl md:text-2xl font-light text-gray-800 leading-relaxed break-keep">함께 읽고 사유하는 둘만의 서재</p>
            <p className="text-sm text-gray-400 font-light">
              {isLoading ? '서재를 불러오는 중입니다.' : quoteSearchBookId ? '책 속 문장을 찾아 서재에 저장하고 있어요.' : '책을 추가하면 공개된 발췌문에서 찾은 문장을 이곳에 모아 보여드려요.'}
            </p>
          </div>
        )}
        {quote && quoteSearchBookId && <p className="text-xs text-gray-400" role="status">새로운 책의 문장을 찾아 저장하고 있어요.</p>}
        {unavailableBooks.length > 0 && (
          <details className="text-left text-xs text-gray-500 border-t border-gray-100 pt-4">
            <summary className="cursor-pointer">문장을 저장하지 못한 책 {unavailableBooks.length}권</summary>
            <ul className="mt-3 space-y-3">
              {unavailableBooks.map(book => (
                <li key={book.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">{book.title}<span className="block mt-1 text-gray-400">{book.quoteLookup?.status === 'error' ? '검색을 완료하지 못했어요.' : '공개된 출처에서 확인 가능한 본문 문장을 찾지 못했어요.'}</span></span>
                  <button type="button" disabled={!!quoteSearchBookId} onClick={() => void retry(book.id)} className="inline-flex shrink-0 items-center gap-1 py-2 disabled:opacity-40"><RefreshCw className="w-3 h-3" />다시 찾기</button>
                </li>
              ))}
            </ul>
          </details>
        )}
        {retryError && <p role="alert" className="text-xs text-amber-700">{retryError}</p>}
        {quoteStorageError && <p role="alert" className="text-xs text-amber-700">{quoteStorageError}</p>}
      </div>
    </div>
  );
}
