import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { getSavedQuotes, buildQuoteRotation } from '@/lib/bookQuotes';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const { books, isLoading } = useData();
  const quotes = useMemo(() => getSavedQuotes(books), [books]);
  const [selected, setSelected] = useState(0);
  const quoteListKey = JSON.stringify(quotes.map(quote => [quote.bookId, quote.text]));
  const rotation = useMemo(() => buildQuoteRotation(quotes), [quoteListKey]);
  const quote = rotation[selected % Math.max(rotation.length, 1)];

  useEffect(() => { setSelected(0); }, [quoteListKey]);

  const pickRandomQuote = () => {
    if (rotation.length < 2) return;
    setSelected(index => (index + 1) % rotation.length);
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

          </div>
        ) : (
          <div className="space-y-3" role="status">
            <p className="text-xl md:text-2xl font-light text-gray-800 leading-relaxed break-keep">함께 읽고 사유하는 둘만의 서재</p>
            <p className="text-sm text-gray-400 font-light">
              {isLoading ? '서재를 불러오는 중입니다.' : '책과 함께 새로운 생각을 만나보세요.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
