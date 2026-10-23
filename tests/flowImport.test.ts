import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEventDate, eventStartAt, sortFlowTimeline, validateImportDrafts, formatEventDate } from '../src/lib/flowTimeline';
import { validateFlowImport, parseImportResult, ImportInputError } from '../server/flowImport';
import handler from '../api/flow-import';
import type { ThoughtFlowHistory, FlowImportDraft } from '../src/types';

const draft: FlowImportDraft = { title: '생각의 변화', summary: '당시의 생각을 돌아보았다.', eventDate: '2025-09', dateEvidence: '2025년 9월', sourceExcerpt: '그때 적은 원문' };
const record = (id: string, date: string, createdAt: string): ThoughtFlowHistory => ({ id, eventDate: date, startAt: eventStartAt(date), endAt: eventStartAt(date), createdAt, summary: draft.summary, kind: 'import' });

test('late 2025-09 import goes between 2025-06 and 2026-03 regardless of upload time', () => {
  const before = [record('june', '2025-06', '2026-10-01'), record('march', '2026-03', '2026-10-02')];
  const result = sortFlowTimeline([...before, record('september', '2025-09', '2026-10-24')]);
  assert.deepEqual(result.map(item => item.id), ['june', 'september', 'march']);
  assert.equal(result[1].eventDate, '2025-09');
  assert.deepEqual(sortFlowTimeline(JSON.parse(JSON.stringify(result))).map(item => item.id), ['june', 'september', 'march']);
});

test('calendar validation rejects invalid days, missing years, ambiguous dates and date overflow', () => {
  for (const value of ['2025-02-29', '2025-04-31', '25-09', '9월', '2025-13', '2025-00', '2025-09-00', '2025-09-32', '', null, '2025-09-01junk']) assert.equal(isEventDate(value), false, String(value));
  for (const value of ['2024-02-29', '2025-09', '2025-09-30']) assert.equal(isEventDate(value), true);
  assert.equal(formatEventDate('2025-09'), '2025년 9월');
  assert.equal(formatEventDate('2025-09-03'), '2025년 9월 3일');
});

test('legacy thought history also sorts by its period, not creation time; ties are stable', () => {
  const legacy = { id: 'legacy', summary: '기존 기록', startAt: '2025-08-01T00:00:00+09:00', endAt: '2025-09-01T00:00:00+09:00', createdAt: '2026-12-01' };
  const entries = [record('september', '2025-09', '2026-10-24'), legacy, record('june', '2025-06', '2026-10-01')];
  assert.deepEqual(sortFlowTimeline(entries).map(item => item.id), ['june', 'legacy', 'september']);
  assert.equal(entries[0].id, 'september');
});

test('unknown AI dates remain unknown and cannot be saved until reviewed', () => {
  const parsed = parseImportResult({ entries: [{ ...draft, eventDate: '지난달' }] });
  assert.equal(parsed[0].eventDate, null);
  assert.throws(() => validateImportDrafts(parsed), /시기/);
  assert.doesNotThrow(() => validateImportDrafts([{ ...parsed[0], eventDate: '2025-09' }]));
  assert.throws(() => validateImportDrafts([]));
});

test('input supports text, real image data and mixed input while rejecting remote URLs and invalid files', () => {
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWO0AAAAASUVORK5CYII=';
  assert.equal(validateFlowImport({ text: '2025년 6월 기록' }).text, '2025년 6월 기록');
  assert.equal(validateFlowImport({ images: [image] }).images.length, 1);
  assert.equal(validateFlowImport({ text: '2025-09', images: [image] }).images.length, 1);
  for (const input of [{}, { text: 'a'.repeat(20_001) }, { images: [image, image, image, image] }, { images: ['https://example.com/image.png'] }, { images: ['data:image/png;base64,YWJjZA=='] }, { images: 'bad' }]) assert.throws(() => validateFlowImport(input), ImportInputError);
});

test('refused or malformed AI output is not a saved timeline', () => {
  assert.throws(() => parseImportResult({ entries: 'not an array' }));
  assert.throws(() => parseImportResult({ entries: [{ ...draft, summary: '' }] }));
  assert.deepEqual(parseImportResult({ entries: [] }), []);
});

test('import API rejects non-POST and unsigned requests before AI analysis', async () => {
  const reply = () => ({ statusCode: 200, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json() { return this; } });
  const get = reply(); await handler({ method: 'GET', headers: {} } as any, get as any); assert.equal(get.statusCode, 405);
  const post = reply(); await handler({ method: 'POST', headers: {}, body: { text: 'test' } } as any, post as any); assert.equal(post.statusCode, 401);
});

test('monthly grouping unifies different days and hides merged originals without deleting them', async () => {
  const { periodKey, historyPeriod, historyVersion } = await import('../src/lib/flowTimeline');
  assert.equal(periodKey('2025-03-16'), periodKey('2025-03-28'));
  const original = record('old', '2025-03-16', '2026-10-24');
  const merged = { ...record('period_2025-03', '2025-03', '2026-10-24'), thoughts: [{ name: '성모', thought: '분류를 다시 생각했다.' }, { name: '민아', thought: '고정된 기준을 의심했다.' }] };
  assert.equal(historyPeriod(original), '2025-03');
  assert.equal(historyVersion(merged) === historyVersion({ ...merged, summary: '새로운 통합 내용' }), false);
  assert.deepEqual(sortFlowTimeline([{ ...original, mergedInto: merged.id }, merged]).map(item => item.id), [merged.id]);
});

test('current shows newest material period, not latest upload date', async () => {
  const { latestThought } = await import('../src/lib/flowTimeline');
  const march = { ...record('march', '2026-03', '2026-10-01'), summary: '성모와 민아의 3월 생각' };
  const old = { ...record('september', '2025-09', '2026-10-24'), summary: '나중에 올린 과거 생각' };
  assert.equal(latestThought([march, old], null)?.summary, march.summary);
  assert.equal(latestThought([march, { ...old, updatedAt: '2026-11-01' }], null)?.summary, march.summary);
  assert.equal(latestThought([], null), null);
});

test('person names and their thoughts remain separate in structured results', () => {
  const thoughts = [{ name: '성모', thought: '분류 기준을 의심했다.' }, { name: '민아', thought: '관점에 따라 이름이 달라진다고 보았다.' }];
  assert.deepEqual(parseImportResult({ entries: [{ ...draft, thoughts }] })[0].thoughts, thoughts);
  assert.throws(() => parseImportResult({ entries: [{ ...draft, thoughts: [{ name: '', thought: '주인이 없는 주장' }] }] }));
  assert.equal(validateFlowImport({ text: '2025년 3월', authorNames: '성모, 민아', existingEntries: [{ eventDate: '2025-03', summary: '기존 내용', thoughts }] }).authorNames, '성모, 민아');
});

test('current prefers a separate short synthesis while detailed thoughts stay in the timeline', async () => {
  const { latestThought } = await import('../src/lib/flowTimeline');
  const detailed = { ...record('latest', '2026-03', '2026-10-24'), summary: '긴 생각과 사례의 상세 기록', currentSummary: '성모는 익숙한 분류 기준을 의심했다.' };
  assert.equal(latestThought([detailed], null)?.summary, detailed.currentSummary);
  assert.equal(detailed.summary, '긴 생각과 사례의 상세 기록');
});


test('conflict comparison ignores Firestore map field order but detects real thought changes', async () => {
  const { historyVersion } = await import('../src/lib/flowTimeline');
  const first = { ...record('period_2025-03', '2025-03', '2026-10-24'), thoughts: [{ name: '성모', thought: '분류를 의심했다.' }] };
  const reordered = { ...first, thoughts: [{ thought: '분류를 의심했다.', name: '성모' }] };
  assert.equal(historyVersion(first), historyVersion(reordered));
  assert.notEqual(historyVersion(first), historyVersion({ ...reordered, thoughts: [{ name: '성모', thought: '다른 생각' }] }));
});
