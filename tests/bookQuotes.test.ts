import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSavedQuotes, needsQuoteLookup, quoteBookKey, buildQuoteRotation } from '../src/lib/bookQuotes';
import { isBookSource, normalizeSource, verifyQuoteCandidates, findBookQuotes } from '../server/bookQuotes';
import handler from '../api/quotes';
import type { Book } from '../src/types';

const quote = { text: '나의 세계는 오늘도 새롭게 태어난다.', sourceUrl: 'https://www.yes24.com/Product/Goods/123', sourceTitle: '테스트 도서 발췌' };
const book: Book = { id: 'new-book', spaceId: 'space', title: '테스트 도서', author: '테스트 작가', status: 'planned', createdAt: '2026-10-24' };
const saved: Book = { ...book, quoteLookup: { key: quoteBookKey(book), status: 'ready', quotes: [quote], backgroundRetryVersion: 2, checkedAt: '2026-10-24' } };
const source = new Set([quote.sourceUrl]);
const fetchPage = (html: string) => (async () => new Response(html, { status: 200 })) as typeof fetch;
const page = `<h1>${book.title}</h1><h2>${book.author}</h2><section>책 속으로<p>${quote.text}</p></section>`;

test('new books need one lookup; saved success, failure and no-result never auto-search on refresh', () => {
  assert.equal(needsQuoteLookup(book), true);
  for (const status of ['ready', 'error', 'not_found'] as const) {
    const persisted = JSON.parse(JSON.stringify({ ...saved, quoteLookup: { ...saved.quoteLookup, status } }));
    assert.equal(needsQuoteLookup(persisted), false);
  }
  assert.equal(needsQuoteLookup({ ...saved, title: '다른 책' }), true);
  assert.equal(needsQuoteLookup({ ...saved, quoteLookup: null }), true);
  assert.equal(needsQuoteLookup({ ...book, deletedAt: '2026-10-24' }), false);
});

test('newly added, reading and completed books all display saved quotes; deleted/stale books do not', () => {
  for (const status of ['planned', 'reading', 'completed'] as const) {
    assert.equal(getSavedQuotes([{ ...saved, status }])[0].bookId, book.id);
  }
  assert.deepEqual(getSavedQuotes([{ ...saved, deletedAt: '2026-10-24' }]), []);
  assert.deepEqual(getSavedQuotes([{ ...saved, author: '다른 작가' }]), []);
  assert.deepEqual(getSavedQuotes([book]), []);
});

test('source policy rejects arbitrary, private, credentialed and lookalike URLs', () => {
  assert.equal(isBookSource(quote.sourceUrl), true);
  for (const url of ['http://yes24.com/a', 'https://yes24.com.evil.test/a', 'https://127.0.0.1/a', 'https://yes24.com:8443/a', 'https://user:pass@yes24.com/a', 'javascript:alert(1)']) {
    assert.equal(isBookSource(url), false, url);
  }
});

test('accepts an exact source excerpt with matching book title and author, deduplicating candidates', async () => {
  assert.deepEqual(await verifyQuoteCandidates([quote, quote], book.title, book.author, source, fetchPage(page)), [quote]);
  assert.equal(normalizeSource('<p>나의&nbsp;세계는</p>'), normalizeSource('나의 세계는'));
});

test('rejects fabricated/paraphrased text, wrong books and uncited sources', async () => {
  assert.deepEqual(await verifyQuoteCandidates([{ ...quote, text: '실제로 이 페이지에 없는 만들어낸 문장입니다.' }], book.title, book.author, source, fetchPage(page)), []);
  assert.deepEqual(await verifyQuoteCandidates([quote], '전혀 다른 제목', book.author, source, fetchPage(page)), []);
  assert.deepEqual(await verifyQuoteCandidates([quote], book.title, '전혀 다른 저자', source, fetchPage(page)), []);
  assert.deepEqual(await verifyQuoteCandidates([quote], book.title, book.author, new Set(), fetchPage(page)), []);
});

test('redirects cannot fetch a private network and unavailable sources remain errors', async () => {
  const urls: string[] = [];
  const redirect = (async (url: string) => { urls.push(url); return new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/internal' } }); }) as typeof fetch;
  assert.deepEqual(await verifyQuoteCandidates([quote], book.title, book.author, source, redirect), []);
  assert.deepEqual(urls, [quote.sourceUrl]);
  await assert.rejects(verifyQuoteCandidates([quote], book.title, book.author, source, (async () => new Response('', { status: 503 })) as typeof fetch));
});

test('lookup validates book input before any API call', async () => {
  await assert.rejects(findBookQuotes({ title: '', author: '작가' }), /INVALID_BOOK/);
});

test('production API rejects non-POST and unauthenticated requests before search', async () => {
  const reply = () => ({ statusCode: 200, body: null as unknown, headers: {} as Record<string, string>, setHeader(key: string, value: string) { this.headers[key] = value; }, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } });
  const get = reply();
  await handler({ method: 'GET', headers: {} } as any, get as any);
  assert.equal(get.statusCode, 405);
  const post = reply();
  await handler({ method: 'POST', headers: {}, body: book } as any, post as any);
  assert.equal(post.statusCode, 401);
});


test('previous unsuccessful lookups do not automatically repeat paid searches', () => {
  for (const status of ['error', 'not_found'] as const) {
    const old = { ...saved, quoteLookup: { ...saved.quoteLookup!, status, backgroundRetryVersion: undefined } };
    assert.equal(needsQuoteLookup(old), false);
    assert.equal(needsQuoteLookup({ ...old, quoteLookup: { ...old.quoteLookup, backgroundRetryVersion: 2 } }), false);
  }
  assert.equal(needsQuoteLookup(saved), false);
});


test('rotation gives every book a turn before its next quote, including uneven quote counts', () => {
  const quotes = [{bookId:'혼모노', n:1}, {bookId:'혼모노', n:2}, {bookId:'한국사', n:1}, {bookId:'데미안', n:1}, {bookId:'데미안', n:2}, {bookId:'데미안', n:3}];
  const deck = buildQuoteRotation(quotes, () => 0.99);
  assert.deepEqual(deck.slice(0, 4), [quotes[0], quotes[2], quotes[3], quotes[1]]);
  for (let i = 0; i < deck.length; i += 3) assert.equal(new Set(deck.slice(i, i + 3).map(q => q.bookId)).size, 3);
  for (let i = 0; i < deck.length; i++) assert.notEqual(deck[i].bookId, deck[(i+1) % deck.length].bookId);
  for (const q of quotes) assert.ok(deck.includes(q));
  assert.deepEqual(buildQuoteRotation([]), []);
  assert.deepEqual(buildQuoteRotation([quotes[0]]), [quotes[0]]);
});


test('one unavailable source does not discard a verified quote from another bookshop', async () => {
  const unavailable = { ...quote, sourceUrl: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=123' };
  const sources = new Set([quote.sourceUrl, unavailable.sourceUrl]);
  const fetcher = (async (url: string) => url === quote.sourceUrl ? new Response(page) : new Response('', {status:503})) as typeof fetch;
  assert.deepEqual(await verifyQuoteCandidates([unavailable, quote], book.title, book.author, sources, fetcher), [quote]);
});


test('archived quotes stay stored and can be restored while other book quotes keep rotating', () => {
  const archived = { ...saved, quoteLookup: { ...saved.quoteLookup!, quotes: [{ ...quote, hidden: true }, { ...quote, text: '다른 생각을 전하는 문장입니다.' }] } };
  assert.deepEqual(getSavedQuotes([archived]).map(q => q.text), ['다른 생각을 전하는 문장입니다.']);
  const restored = { ...archived, quoteLookup: { ...archived.quoteLookup, quotes: archived.quoteLookup.quotes.map(q => ({...q,hidden:false})) } };
  assert.equal(getSavedQuotes([restored]).length, 2);
});
