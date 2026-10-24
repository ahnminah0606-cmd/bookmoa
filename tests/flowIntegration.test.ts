import test from 'node:test';
import assert from 'node:assert/strict';
import { FlowConflictError, retryFlowIntegration, manualFlowDraft } from '../src/lib/flowIntegration';

test('same person and month re-integrates concurrent material against latest stored thoughts', async () => {
  let stored = { person: '성모', month: '2025-03', materials: ['first'], thought: '첫 생각' };
  let calls = 0;
  const result = await retryFlowIntegration(async () => {
    calls++;
    const context = stored;
    const combined = { ...context, materials: [...context.materials, 'new'], thought: context.thought + ' + 새 생각' };
    if (calls === 1) stored = { ...stored, materials: [...stored.materials, 'concurrent'], thought: '첫 생각 + 동시에 추가한 생각' };
    if (stored !== context) throw new FlowConflictError();
    stored = combined;
    return stored;
  });
  assert.equal(calls, 2);
  assert.deepEqual(result.materials, ['first', 'concurrent', 'new']);
  assert.equal(result.thought, '첫 생각 + 동시에 추가한 생각 + 새 생각');
  assert.equal(result.month, '2025-03');
});

test('persistent conflicts stop after three attempts', async () => {
  let calls = 0;
  await assert.rejects(retryFlowIntegration(async () => { calls++; throw new FlowConflictError(); }), FlowConflictError);
  assert.equal(calls, 3);
});

test('authentication and AI errors do not cause repeated requests', async () => {
  let calls = 0;
  await assert.rejects(retryFlowIntegration(async () => { calls++; throw new Error('로그인이 필요합니다.'); }), /로그인/);
  assert.equal(calls, 1);
});


test('manual save preserves other people and periods without mutating source history', () => {
  const march = { id: 'period_2025-03', kind: 'import' as const, title: '기존 제목', summary: '기존', eventDate: '2025-03', startAt: '2025-03-01', endAt: '2025-03-01', createdAt: '2025-03-01', thoughts: [{ name:'성모', thought:'이전 생각' }, { name:'민아', thought:'민아 생각' }] };
  const april = { ...march, id:'period_2025-04', eventDate:'2025-04', thoughts:[{ name:'성모', thought:'4월 생각' }] };
  const draft = manualFlowDraft([march, april], '2025-03', '성모', '새로운 생각', '새 제목');
  assert.equal(draft.title, '새 제목');
  assert.deepEqual(draft.thoughts, [{name:'성모',thought:'이전 생각\n\n새로운 생각'}, {name:'민아',thought:'민아 생각'}]);
  assert.equal(march.thoughts[0].thought, '이전 생각');
  assert.ok(!draft.summary.includes('4월 생각'));
  assert.equal(draft.eventDate, '2025-03');
});
