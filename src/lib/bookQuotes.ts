import type { Book, BookQuote } from '../types';

export function quoteBookKey(book: Pick<Book, 'title' | 'author' | 'isbn'>): string {
  return JSON.stringify([book.title.trim(), book.author.trim(), book.isbn?.replace(/[^0-9X]/gi, '') || '']);
}

export function getSavedQuotes(books: Book[]): (BookQuote & { bookId: string; bookTitle: string })[] {
  return books.filter(book => !book.deletedAt && book.quoteLookup?.status === 'ready' && book.quoteLookup.key === quoteBookKey(book))
    .flatMap(book => (book.quoteLookup?.quotes || []).map(quote => ({
      ...quote, bookId: book.id, bookTitle: book.title,
    })));
}

export function needsQuoteLookup(book: Book): boolean {
  return !book.deletedAt && (book.quoteLookup?.key !== quoteBookKey(book)
    || (book.quoteLookup.status !== 'ready' && book.quoteLookup.backgroundRetryVersion !== 1));
}
