import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Search, Plus, X, Loader2, BookPlus, PenLine } from 'lucide-react';
import { searchBooks, POPULAR_BOOKS_DB } from '@/lib/googleBooks';
import { BookCover } from '@/components/common/BookCover';

export default function Library() {
  const { getActiveBooks, addBook } = useData();
  const allBooks = getActiveBooks();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'reading' | 'completed' | 'planned'>('all');
  const [sort, setSort] = useState<'recent_read' | 'recent_added' | 'title' | 'author'>('recent_added');
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'manual'>('search');
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<any[]>(POPULAR_BOOKS_DB.slice(0, 10));
  const [isSearching, setIsSearching] = useState(false);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualIsbn, setManualIsbn] = useState('');
  const [manualPublisher, setManualPublisher] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');

  // Initial load suggestions when opening modal
  useEffect(() => {
    if (isAddModalOpen && !addSearchQuery) {
      setAddSearchResults(POPULAR_BOOKS_DB.slice(0, 10));
    }
  }, [isAddModalOpen, addSearchQuery]);

  // Filter and Sort Books in Library
  const filteredBooks = allBooks.filter(book => {
    if (filter !== 'all' && book.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (sort === 'recent_added') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === 'recent_read') return new Date(b.completedAt || b.startedAt || b.createdAt).getTime() - new Date(a.completedAt || a.startedAt || a.createdAt).getTime();
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'author') return a.author.localeCompare(b.author);
    return 0;
  });

  const handleAddSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!addSearchQuery.trim()) {
      setAddSearchResults(POPULAR_BOOKS_DB.slice(0, 6));
      return;
    }
    setIsSearching(true);
    const results = await searchBooks(addSearchQuery);
    setAddSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectBookToAdd = (bookInfo: any) => {
    addBook({
      title: bookInfo.title,
      author: bookInfo.author,
      isbn: bookInfo.isbn,
      googleBooksId: bookInfo.googleBooksId,
      coverImage: bookInfo.coverImage,
      publisher: bookInfo.publisher,
      publishedDate: bookInfo.publishedDate,
      description: bookInfo.description,
      pageCount: bookInfo.pageCount,
      categories: bookInfo.categories,
      language: bookInfo.language,
      status: 'planned'
    });
    closeModal();
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const cleanIsbn = manualIsbn.replace(/[^0-9X]/gi, '').trim();
    const coverImage = manualCoverUrl.trim() || (cleanIsbn ? `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${cleanIsbn}.jpg` : undefined);

    addBook({
      title: manualTitle.trim(),
      author: manualAuthor.trim() || '저자 미상',
      isbn: cleanIsbn || undefined,
      publisher: manualPublisher.trim() || undefined,
      status: 'planned',
      coverImage: coverImage
    });

    closeModal();
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setAddSearchQuery('');
    setManualTitle('');
    setManualAuthor('');
    setManualIsbn('');
    setManualPublisher('');
    setManualCoverUrl('');
    setAddMode('search');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 pb-16 md:px-8 md:py-8 md:pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100 md:mb-8 md:pb-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <h1 className="text-xl font-medium text-gray-900">라이브러리</h1>
          <span className="shrink-0 text-xs text-gray-400 sm:text-sm">총 {filteredBooks.length}권</span>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs rounded-md hover:bg-gray-800 transition-colors shadow-sm sm:gap-2 sm:px-4 sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          책 추가
        </button>
      </div>

      {/* Tools */}
      <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:gap-4 md:mb-12">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="제목, 저자로 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-900 transition-colors"
          />
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="min-w-0 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-900 appearance-none bg-white sm:min-w-[100px]"
          >
            <option value="all">전체</option>
            <option value="reading">읽는 중</option>
            <option value="completed">완독</option>
            <option value="planned">읽기 예정</option>
          </select>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value as any)}
            className="min-w-0 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-900 appearance-none bg-white sm:min-w-[120px]"
          >
            <option value="recent_added">최근 추가한 순</option>
            <option value="recent_read">최근 읽은 순</option>
            <option value="title">제목순</option>
            <option value="author">저자순</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredBooks.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <p className="text-gray-400 text-sm">라이브러리에 등록된 책이 없습니다.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            첫 번째 책 추가하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-x-6 md:gap-y-10 lg:grid-cols-5">
          {filteredBooks.map((book) => (
            <Link key={book.id} to={`/library/${book.id}`} className="group flex min-w-0 flex-col gap-2 md:gap-3">
              <BookCover
                title={book.title}
                author={book.author}
                coverImage={book.coverImage}
                isbn={book.isbn}
                size="md"
                className="transform group-hover:-translate-y-1 transition-transform"
              />
              <div className="min-w-0 space-y-0.5 px-1 text-center">
                <h3 className="line-clamp-2 break-keep text-[13px] font-medium leading-snug text-gray-900 transition-colors group-hover:text-gray-600 sm:text-sm">
                  {book.title}
                </h3>
                <p className="text-xs text-gray-400 truncate">{book.author}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Book Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-100">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                <h2 className="text-lg font-medium text-gray-900">책 추가</h2>
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setAddMode('search')}
                    className={`px-3 py-1 rounded-md transition-all ${addMode === 'search' ? 'bg-white text-gray-900 font-medium shadow-xs' : 'text-gray-500'}`}
                  >
                    도서 검색
                  </button>
                  <button
                    onClick={() => setAddMode('manual')}
                    className={`px-3 py-1 rounded-md transition-all ${addMode === 'manual' ? 'bg-white text-gray-900 font-medium shadow-xs' : 'text-gray-500'}`}
                  >
                    직접 입력
                  </button>
                </div>
              </div>
              <button 
                onClick={closeModal} 
                className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {addMode === 'search' ? (
              <>
                <form onSubmit={handleAddSearch} className="p-4 border-b border-gray-100 flex flex-col gap-2 bg-gray-50/50 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="책 제목, 저자, ISBN 검색 (예: 사피엔스, 도둑맞은 집중력)"
                      value={addSearchQuery}
                      onChange={e => setAddSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 text-sm bg-white"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSearching} 
                    className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition-colors shrink-0"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {!addSearchQuery && (
                    <div className="text-xs text-gray-400 font-medium px-1 mb-2">추천 도서 목록</div>
                  )}

                  {addSearchResults.map((res, idx) => (
                    <div 
                      key={idx} 
                      className="flex min-w-0 gap-3 sm:gap-4 p-3 border border-gray-100 rounded-xl hover:border-gray-300 hover:bg-gray-50/30 transition-all bg-white group items-center"
                    >
                      <BookCover
                        title={res.title}
                        author={res.author}
                        coverImage={res.coverImage}
                        isbn={res.isbn}
                        size="xs"
                        showShadow={false}
                        className="w-12 h-16 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm leading-snug group-hover:text-gray-950 truncate">
                          {res.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{res.author}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                          {res.publisher && <span>{res.publisher}</span>}
                          {res.publishedDate && <span>· {res.publishedDate.substring(0, 4)}</span>}
                          {res.isbn && <span className="font-mono">· ISBN {res.isbn}</span>}
                        </div>
                      </div>

                      <button 
                        onClick={() => handleSelectBookToAdd(res)}
                        className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 rounded-lg group-hover:bg-gray-900 group-hover:text-white group-hover:border-transparent transition-all shrink-0"
                      >
                        선택
                      </button>
                    </div>
                  ))}

                  {addSearchResults.length === 0 && !isSearching && (
                    <div className="text-center py-12 space-y-3">
                      <p className="text-gray-400 text-sm">검색 결과가 없습니다.</p>
                      <button
                        onClick={() => setAddMode('manual')}
                        className="text-xs text-gray-600 underline hover:text-gray-900"
                      >
                        원하는 책 정보 직접 입력하기
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Manual Input Form */
              <form onSubmit={handleManualSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-4 items-stretch sm:flex-row sm:items-start">
                  {/* Live Cover Preview */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-gray-400 font-medium">표지 미리보기</span>
                    <BookCover
                      title={manualTitle || '책 제목'}
                      author={manualAuthor || '저자명'}
                      isbn={manualIsbn.replace(/[^0-9X]/gi, '').trim()}
                      coverImage={manualCoverUrl.trim() || undefined}
                      className="w-20 h-28"
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">책 제목 *</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 사피엔스"
                        value={manualTitle}
                        onChange={e => setManualTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">저자명</label>
                      <input
                        type="text"
                        placeholder="예: 유발 하라리"
                        value={manualAuthor}
                        onChange={e => setManualAuthor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-700">ISBN (13자리 숫자)</label>
                      <span className="text-[10px] text-emerald-600 font-medium">표지 자동 연결</span>
                    </div>
                    <input
                      type="text"
                      placeholder="예: 9788934972464"
                      value={manualIsbn}
                      onChange={e => setManualIsbn(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">출판사 (선택)</label>
                    <input
                      type="text"
                      placeholder="예: 김영사"
                      value={manualPublisher}
                      onChange={e => setManualPublisher(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-medium text-gray-700">표지 이미지 URL 직접 입력 (선택)</label>
                  <input
                    type="url"
                    placeholder="https://... 책 표지 이미지 주소 복사 붙여넣기"
                    value={manualCoverUrl}
                    onChange={e => setManualCoverUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-900 font-mono text-gray-600"
                  />
                  <p className="text-[11px] text-gray-400 leading-relaxed pt-0.5">
                    💡 서점(교보문고, Yes24, 알라딘 등)의 13자리 <strong>ISBN</strong>을 입력하시거나 <strong>이미지 링크</strong>를 붙여넣으시면 실물 표지가 즉시 등록됩니다.
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setAddMode('search')}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                  >
                    검색으로 돌아가기
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    등록 완료
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
