import type { FlowImportDraft, ThoughtFlowHistory } from '../types';
import { historyPeriod } from './flowTimeline';

export class FlowConflictError extends Error {
  constructor() {
    super('기록이 계속 업데이트되고 있어요. 잠시 후 다시 눌러 주세요. 입력한 자료는 그대로 남아 있어요.');
    this.name = 'FlowConflictError';
  }
}

// Repeat the entire read → AI integration → transaction, never a stale write.
export async function retryFlowIntegration<T>(integrate: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await integrate(); }
    catch (cause) {
      if (!(cause instanceof FlowConflictError) || attempt >= 2) throw cause;
    }
  }
}

export function manualFlowDraft(history: ThoughtFlowHistory[], month: string, name: string, text: string, title: string): FlowImportDraft {
  const previous = history.filter(item => historyPeriod(item) === month);
  const thoughts = previous.flatMap(item => item.thoughts?.length ? item.thoughts.map(person => ({ ...person })) : [{ name: '작성자 미확인', thought: item.summary }]);
  const person = thoughts.find(person => person.name === name);
  if (person) person.thought = person.thought === text ? text : person.thought + '\n\n' + text;
  else thoughts.push({ name, thought: text });
  const summary = thoughts.map(person => `${person.name}: ${person.thought}`).join('\n\n');
  return { title: title.trim() || previous[0]?.title || text.split(/[.!?\n]/)[0].slice(0, 24), summary,
    currentSummary: thoughts.map(person => `${person.name}: ${person.name === name ? text : person.thought}`).join('\n\n').slice(0, 650),
    thoughts, eventDate: month, sourceExcerpt: text, dateEvidence: month };
}
