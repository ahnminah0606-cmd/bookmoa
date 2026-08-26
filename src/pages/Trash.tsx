import { useData } from '@/contexts/DataContext';
import { RotateCcw, Trash2 } from 'lucide-react';

export default function Trash() {
  const { getTrashBooks, restoreBook, permanentlyDeleteBook } = useData();
  const trashBooks = getTrashBooks();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 pb-24">
      <div className="flex items-center justify-between mb-12 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">휴지통</h1>
          <p className="text-sm text-gray-500 mt-2">삭제된 항목은 30일 후 영구 삭제됩니다.</p>
        </div>
        <span className="text-sm text-gray-500">총 {trashBooks.length}개</span>
      </div>

      {trashBooks.length === 0 ? (
        <div className="py-24 text-center text-gray-400">
          휴지통이 비어 있습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {trashBooks.map((book) => (
            <div key={book.id} className="flex items-center justify-between p-4 bg-[#FAFAFA] rounded-xl border border-gray-100">
              <div className="space-y-1">
                <h3 className="font-medium text-gray-900">{book.title}</h3>
                <p className="text-xs text-gray-500">
                  {new Date(book.deletedAt!).toLocaleDateString('ko-KR')} 삭제됨
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => restoreBook(book.id)}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
                  title="복원"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('이 항목을 영구 삭제하시겠습니까? 복구할 수 없습니다.')) {
                      permanentlyDeleteBook(book.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                  title="영구 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
