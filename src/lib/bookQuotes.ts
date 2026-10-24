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


// Every round gives each book one turn, regardless of how many quotes it has.
export function buildQuoteRotation<T extends { bookId: string }>(quotes: T[], random = Math.random): T[] {
  const shuffle = <V,>(items: V[]): V[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const byBook = new Map<string, T[]>();
  for (const quote of quotes) {
    const group = byBook.get(quote.bookId) || [];
    group.push(quote);
    byBook.set(quote.bookId, group);
  }
  const groups = shuffle([...byBook.values()]).map(shuffle);
  const rounds = groups.reduce((count, group) => Math.max(count, group.length), 0);
  return Array.from({ length: rounds }, (_, round) => groups.map(group => group[round % group.length])).flat();
}
