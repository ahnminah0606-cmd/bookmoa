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
