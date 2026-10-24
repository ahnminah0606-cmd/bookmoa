import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import BookQuoteEditor from '@/components/BookQuoteEditor';
import { quoteBookKey } from '@/lib/bookQuotes';

export default function QuoteManager() {
  const { books, isLoading } = useData();
  const [search, setSearch] = useState('');
  const activeBooks = books.filter(book => !book.deletedAt).sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  const saved = activeBooks.flatMap(book => book.quoteLookup?.key === quoteBookKey(book) ? book.quoteLookup.quotes : []);
  const visibleBooks = activeBooks.filter(book => !search.trim() || book.title.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="mx-auto max-w-4xl px-4 py-8 pb-24 md:px-8">
    <header className="mb-8 space-y-2 border-b border-gray-100 pb-6">
      <h1 className="text-xl font-medium text-gray-900">명문장 관리</h1>
      <p className="text-sm leading-relaxed text-gray-500">책 제목을 눌러 문장을 수정하거나 삭제하세요. 삭제한 문장은 복구할 수 있어요.</p>
      {!isLoading && <p className="text-xs text-gray-400">홈에 표시 중 {saved.filter(quote => !quote.hidden).length}문장 · 삭제한 문장 {saved.filter(quote => quote.hidden).length}개</p>}
    </header>
    <label className="mb-5 block text-sm text-gray-500">책 찾기<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="책 제목 검색" className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" /></label>
    {isLoading ? <p role="status" className="py-12 text-center text-sm text-gray-400">명문장을 불러오는 중...</p> : <div className="space-y-3">{visibleBooks.map(book => <div key={book.id}><BookQuoteEditor book={book} management /></div>)}{!visibleBooks.length && <p className="py-12 text-center text-sm text-gray-400">{search ? '검색한 책이 없어요.' : '책을 추가하면 여기에서 명문장을 관리할 수 있어요.'}</p>}</div>}
  </div>;
}
