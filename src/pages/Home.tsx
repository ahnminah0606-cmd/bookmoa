import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { mockQuotes } from '@/lib/mockData';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function Home() {
  const { getActiveBooks } = useData();
  const [quote, setQuote] = useState<{ bookTitle: string; text: string } | null>(null);
  const [isFading, setIsFading] = useState(false);

  const activeBooks = getActiveBooks();
  
  // Find current reading book
  const currentReadingBook = useMemo(() => {
    return activeBooks.find(b => b.status === 'reading');
  }, [activeBooks]);

  // Find completed books
  const completedBooks = useMemo(() => {
    return activeBooks.filter(b => b.status === 'completed');
  }, [activeBooks]);

  // Filter quotes: Include completed books from the library, STRICTLY exclude the currently reading book
  const eligibleQuotes = useMemo(() => {
    return mockQuotes.filter(q => {
      // Exclude if it belongs to the current reading book
      if (currentReadingBook && (
        q.bookTitle.includes(currentReadingBook.title) ||
        currentReadingBook.title.includes(q.bookTitle)
      )) {
        return false;
      }

      // Include if it belongs to any completed book in the user's library
      const isCompleted = completedBooks.some(b => 
        b.title.includes(q.bookTitle) || q.bookTitle.includes(b.title)
      );

      return isCompleted;
    });
  }, [completedBooks, currentReadingBook]);

  const pickRandomQuote = () => {
    const pool = eligibleQuotes.length > 0 ? eligibleQuotes : mockQuotes.filter(q => {
      if (currentReadingBook && (
        q.bookTitle.includes(currentReadingBook.title) ||
        currentReadingBook.title.includes(q.bookTitle)
      )) {
        return false;
      }
      return true;
    });

    if (pool.length > 0) {
      setIsFading(true);
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * pool.length);
        setQuote(pool[randomIndex]);
        setIsFading(false);
      }, 150);
    }
  };

  useEffect(() => {
    pickRandomQuote();
  }, [eligibleQuotes.length, currentReadingBook?.id]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center bg-white select-none">
      <div className="max-w-2xl w-full space-y-6">
        {quote ? (
          <div 
            onClick={pickRandomQuote}
            className={`transition-all duration-300 cursor-pointer group space-y-4 ${
              isFading ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
            }`}
            title="클릭하여 지난 서재 속 다른 문장 보기"
          >
            <div className="text-sm text-gray-400 font-medium tracking-wider">
              {quote.bookTitle}
            </div>
            <p className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed break-keep">
              "{quote.text}"
            </p>
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-300 group-hover:text-gray-500 transition-colors">
              <Sparkles className="w-3.5 h-3.5" />
              <span>완독한 서재의 사유를 다시 마주하는 중 (클릭 시 다른 문장)</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xl md:text-2xl font-light text-gray-800 leading-relaxed break-keep">
              함께 읽고 사유하는 둘만의 서재
            </p>
            <p className="text-sm text-gray-400 font-light">
              책을 읽고 대화를 기록하면 인상적인 문장과 생각들이 이곳에 머뭅니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
