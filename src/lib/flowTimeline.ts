import type { FlowImportDraft, ThoughtFlowHistory, ThoughtFlowCurrent } from '../types';

// Calendar dates are kept as date strings: upload times must never decide their position.
export function isEventDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(value)) return false;
  const full = value.length === 7 ? `${value}-01` : value;
  const year = Number(full.slice(0, 4));
  return year >= 1900 && year <= 2100 && new Date(`${full}T00:00:00Z`).toISOString().slice(0, 10) === full;
}

export function eventStartAt(value: string): string {
  if (!isEventDate(value)) throw new Error('시기를 YYYY-MM 또는 YYYY-MM-DD 형식으로 입력해 주세요.');
  return `${value.length === 7 ? `${value}-01` : value}T00:00:00+09:00`;
}

export function sortFlowTimeline(history: ThoughtFlowHistory[]): ThoughtFlowHistory[] {
  return history.filter(item => !item.mergedInto).sort((a, b) => {
    const time = (item: ThoughtFlowHistory) => {
      const date = item.eventDate && isEventDate(item.eventDate) ? eventStartAt(item.eventDate) : item.startAt || item.createdAt;
      const millis = Date.parse(date);
      return Number.isFinite(millis) ? millis : 0;
    };
    return time(a) - time(b) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  });
}

export function periodKey(date: string): string {
  if (!isEventDate(date)) throw new Error('시기를 확인해 주세요.');
  return date.slice(0, 7);
}

export function historyPeriod(item: ThoughtFlowHistory): string | null {
  if (item.kind !== 'import' || item.mergedInto) return null;
  return item.eventDate && isEventDate(item.eventDate) ? periodKey(item.eventDate) : null;
}

export function historyVersion(item?: ThoughtFlowHistory): string {
  return item ? JSON.stringify([item.summary, item.thoughts || [], item.updatedAt || item.createdAt, item.mergedInto || '', item.materials?.map(material => material.id) || []]) : '';
}

export function timelineTitle(item: ThoughtFlowHistory): string {
  const title = (item.title || '').split(/\s+[—–]\s+/).at(-1)!.trim();
  const dateTitle = /^\d{4}(?:년|[-/.])/u.test(title);
  const text = title && !dateTitle ? title : item.summary.replace(/^[^:\n]{1,20}:\s*/, '').split(/[\n。.!?]/)[0].trim();
  const singleLine = text.replace(/\s+/g, ' ').trim() || '함께 돌아본 생각';
  return singleLine.length > 32 ? `${singleLine.slice(0, 31).trim()}…` : singleLine;
}

export function latestThought(history: ThoughtFlowHistory[], current: ThoughtFlowCurrent | null): { summary: string; startAt: string; eventDate?: string } | null {
  const latest = sortFlowTimeline(history).filter(item => item.summary.trim()).at(-1);
  const currentDate = current?.analyzedThrough || current?.startAt;
  if (current?.summary && (!latest || (currentDate && Date.parse(currentDate) > Date.parse(latest.startAt)))) {
    return { summary: current.summary, startAt: currentDate || current.startAt };
  }
  return latest ? { summary: latest.summary, startAt: latest.startAt, eventDate: latest.eventDate } : null;
}

export function formatEventDate(value: string): string {
  if (!isEventDate(value)) return '시기 확인 필요';
  const [year, month, day] = value.split('-');
  return `${year}년 ${Number(month)}월${day ? ` ${Number(day)}일` : ''}`;
}

export function validateImportDrafts(entries: FlowImportDraft[]): void {
  if (!entries.length || entries.length > 12) throw new Error('정리할 기록은 1개 이상 12개 이하여야 합니다.');
  for (const entry of entries) {
    if (!isEventDate(entry.eventDate)) throw new Error('모든 기록의 시기를 확인해 주세요. YYYY-MM 또는 YYYY-MM-DD로 입력할 수 있어요.');
    if (!entry.title.trim() || entry.title.length > 100 || !entry.summary.trim() || entry.summary.length > 3000
      || entry.sourceExcerpt.length > 6000 || entry.dateEvidence.length > 500) throw new Error('제목, 생각 정리와 원문 길이를 확인해 주세요.');
  }
}
