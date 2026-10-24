import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSavedQuotes, needsQuoteLookup, quoteBookKey } from '../src/lib/bookQuotes';
import { isBookSource, normalizeSource, verifyQuoteCandidates, findBookQuotes } from '../server/bookQuotes';
import handler from '../api/quotes';
import type { Book } from '../src/types';

const quote = { text: '나의 세계는 오늘도 새롭게 태어난다.', sourceUrl: 'https://www.yes24.com/Product/Goods/123', sourceTitle: '테스트 도서 발췌' };
const book: Book = { id: 'new-book', spaceId: 'space', title: '테스트 도서', author: '테스트 작가', status: 'planned', createdAt: '2026-10-24' };
const saved: Book = { ...book, quoteLookup: { key: quoteBookKey(book), status: 'ready', quotes: [quote], backgroundRetryVersion: 1, checkedAt: '2026-10-24' } };
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


test('previous unsuccessful lookups retry once in the background, with no refresh loop', () => {
  for (const status of ['error', 'not_found'] as const) {
    const old = { ...saved, quoteLookup: { ...saved.quoteLookup!, status, backgroundRetryVersion: undefined } };
    assert.equal(needsQuoteLookup(old), true);
    assert.equal(needsQuoteLookup({ ...old, quoteLookup: { ...old.quoteLookup, backgroundRetryVersion: 1 } }), false);
  }
  assert.equal(needsQuoteLookup(saved), false);
});
