import { useRef, useState, useEffect } from 'react';
import { collection, doc, getDocsFromServer, runTransaction } from 'firebase/firestore';
import { ImagePlus, LoaderCircle, Upload, X, Check } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { eventStartAt, formatEventDate, validateImportDrafts, periodKey, historyPeriod, historyVersion } from '@/lib/flowTimeline';
import { FlowConflictError, retryFlowIntegration } from '@/lib/flowIntegration';
import type { FlowImportDraft, ThoughtFlowHistory, FlowMaterial } from '@/types';

type ImageAttachment = { id: string; name: string; dataUrl: string };
type Draft = FlowImportDraft & { id: string };

async function prepareImage(file: File): Promise<string> {
  if (file.size > 20_000_000) throw new Error('이미지 한 장은 20MB 이하로 올려 주세요.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이미지를 준비하지 못했습니다.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    if (dataUrl.length > 1_100_000) throw new Error('이미지가 너무 큽니다. 필요한 부분을 나누어 올려 주세요.');
    return dataUrl;
  } finally { bitmap.close(); }
}

export default function FlowImport({ onSaved, assignment }: { history: ThoughtFlowHistory[]; onSaved: (id: string) => void; assignment?: { item: ThoughtFlowHistory; name: string; requestId: string } | null }) {
  const { spaceId, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const authorNames = selectedNames.join(', ');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [textSources, setTextSources] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState<'files' | 'analyzing' | 'saving' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const batchIdentity = useRef({ id: '', createdAt: '' });
  const operationRunning = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingAssignment, setPendingAssignment] = useState<string | null>(null);
  const assignmentStarted = useRef('');
  useEffect(() => {
    if (!assignment) return;
    setText(`사용자가 확인한 작성자는 ${assignment.name}이다. 아래는 그 사람이 쓴 원문이다.\n시기: ${assignment.item.eventDate || assignment.item.startAt.slice(0, 10)}\n\n${assignment.item.sourceExcerpt || assignment.item.summary}`);
    setSelectedNames(assignment.name.split(',').map(name => name.trim())); setImages([]); setTextSources(assignment.item.sourceNames || []); setDrafts(null);
    setPendingAssignment(assignment.requestId); setIsOpen(true);
  }, [assignment?.requestId]);
  const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-500 disabled:opacity-50';

  const addFiles = async (files: File[]) => {
    if (operationRunning.current || !files.length) return;
    operationRunning.current = true; setBusy('files'); setError('');
    try {
      const nextImages = [...images], names = [...textSources];
      let nextText = text;
      for (const file of files) {
        if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
          if (nextImages.length >= 3) throw new Error('이미지는 한 번에 3장까지 올릴 수 있어요.');
          nextImages.push({ id: crypto.randomUUID(), name: file.name, dataUrl: await prepareImage(file) });
        } else if (/\.(txt|md|json)$/i.test(file.name) || file.type === 'text/plain') {
          if (file.size > 80_000) throw new Error('텍스트 파일은 한 번에 20,000자 이내로 나누어 올려 주세요.');
          nextText += `\n\n[자료: ${file.name}]\n${await file.text()}`; names.push(file.name);
        } else throw new Error('PNG, JPG, WebP 이미지 또는 TXT, MD, JSON 글 파일을 올려 주세요.');
      }
      if (nextText.length > 20_000) throw new Error('글은 한 번에 20,000자까지 정리할 수 있어요.');
      setImages(nextImages); setText(nextText.trim()); setTextSources(names);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '파일을 읽지 못했습니다.'); }
    finally { operationRunning.current = false; setBusy(null); if (fileInput.current) fileInput.current.value = ''; }
  };

  const saveEntries = async (entries: FlowImportDraft[], context: ThoughtFlowHistory[]) => {
    validateImportDrafts(entries);
    const months = entries.map(entry => periodKey(entry.eventDate!));
    if (new Set(months).size !== months.length) throw new Error('같은 시기의 자료를 다시 한 번 통합해 주세요.');
    const { id: importId, createdAt } = batchIdentity.current;
    const sourceNames = [...textSources, ...images.map(image => image.name)];
    if (text.trim() && !textSources.length) sourceNames.unshift('붙여 넣은 글');
    const targets = entries.map(entry => {
      const month = periodKey(entry.eventDate!);
      const id = `period_${month}`;
      const previous = context.filter(item => historyPeriod(item) === month);
      for (const person of previous.flatMap(item => item.thoughts || [])) {
        if (!entry.thoughts?.some(thought => thought.name === person.name)) throw new Error(`${person.name}의 이전 생각을 함께 보존하도록 다시 정리해 주세요.`);
      }
      return { entry, month, id, previous };
    });
    await runTransaction(db, async transaction => {
      // Read every affected record before writing so another upload cannot be silently overwritten.
      const ids = [...new Set(targets.flatMap(target => [target.id, ...target.previous.map(item => item.id)]))];
      const snapshots = await Promise.all(ids.map(id => transaction.get(doc(db, 'spaces', spaceId!, 'flowHistory', id))));
      const live = new Map(snapshots.map((snap, index) => [ids[index], snap.exists() ? { ...snap.data(), id: ids[index] } as ThoughtFlowHistory : undefined]));
      for (const id of ids) {
        if (historyVersion(live.get(id)) !== historyVersion(context.find(item => item.id === id))) throw new FlowConflictError();
      }
      for (const { entry, month, id, previous } of targets) {
        const materials: FlowMaterial[] = previous.flatMap(item => item.materials || [{ id: item.id, authorNames: '작성자 미확인', sourceExcerpt: item.sourceExcerpt || item.summary, dateEvidence: item.dateEvidence || '', sourceNames: item.sourceNames || [], createdAt: item.createdAt }]);
        const materialId = `${importId}_${month}`;
        // Re-uploading may refresh the summary without duplicating its source.
        if (!materials.some(material => material.id === materialId)) materials.push({ id: materialId, authorNames: authorNames.trim(), sourceExcerpt: entry.sourceExcerpt, dateEvidence: entry.dateEvidence, sourceNames, createdAt });
        const startAt = eventStartAt(month);
        const record = {
          kind: 'import' as const, title: entry.title.trim(), summary: entry.summary,
          thoughts: entry.thoughts || [], eventDate: month, startAt, endAt: startAt,
          currentSummary: entry.currentSummary || entry.summary,
          createdAt: previous.map(item => item.createdAt).sort()[0] || createdAt,
          updatedAt: new Date().toISOString(), materials, importedBy: user?.uid || '',
          sourceExcerpt: entry.sourceExcerpt, dateEvidence: entry.dateEvidence, sourceNames,
        };
        if (new TextEncoder().encode(JSON.stringify(record)).length > 800_000) throw new Error('이 시기의 자료가 너무 많아 저장하지 못했어요.');
        transaction.set(doc(db, 'spaces', spaceId!, 'flowHistory', id), record);
        for (const old of previous) if (old.id !== id) transaction.update(doc(db, 'spaces', spaceId!, 'flowHistory', old.id), { mergedInto: id });
      }
    });
    return targets[0].id;
  };

  const analyze = async (confirmedDates = false) => {
    if (operationRunning.current || !spaceId) return;
    if (!authorNames.trim()) { setError('민아 또는 성모를 선택해 주세요.'); return; }
    if (confirmedDates && drafts) {
      try { validateImportDrafts(drafts); } catch (cause) { setError((cause as Error).message); return; }
    }
    operationRunning.current = true; setBusy('analyzing'); setError(''); setSuccess('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('로그인이 필요합니다.');
      const hints = confirmedDates && drafts ? `사용자가 확인한 시기: ${JSON.stringify(drafts.map(entry => ({ eventDate: entry.eventDate, sourceExcerpt: entry.sourceExcerpt })))}` : '';
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([authorNames.trim(), text, images.map(image => image.dataUrl)])));
      batchIdentity.current = { id: Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join(''), createdAt: new Date().toISOString() };
      const id = await retryFlowIntegration(async () => {
        setBusy('analyzing');
        const snapshot = await getDocsFromServer(collection(db, 'spaces', spaceId, 'flowHistory'));
        const context = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as ThoughtFlowHistory)).filter(item => !item.mergedInto);
        const response = await fetch('/api/flow-import', {
          method: 'POST', signal: AbortSignal.timeout(60_000),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: [hints, text].filter(Boolean).join('\n\n'), images: images.map(image => image.dataUrl), authorNames,
            existingEntries: context.filter(item => historyPeriod(item)).map(item => ({ eventDate: item.eventDate, summary: item.summary, thoughts: item.thoughts || [], sourceExcerpt: item.sourceExcerpt || '', materials: (item.materials || []).map(material => ({ authorNames: material.authorNames, sourceExcerpt: material.sourceExcerpt })) })),
          }),
        });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.entries)) throw new Error(result.error || '자료를 정리하지 못했습니다.');
        if (!result.entries.length) throw new Error('읽을 수 있는 생각 기록을 찾지 못했어요. 글자가 잘 보이는 자료를 올려 주세요.');
        if (result.entries.some((entry: FlowImportDraft) => !entry.eventDate)) {
          setDrafts(result.entries.map((entry: FlowImportDraft) => ({ ...entry, id: crypto.randomUUID() })));
          return;
        }
        setBusy('saving');
        return saveEntries(result.entries, context);
      });
      if (!id) return;
      setSuccess('자료 속 시기에 맞춰 사람별 생각을 정리했어요. 같은 시기의 기록은 함께 업데이트했습니다.');
      setDrafts(null); setText(''); setImages([]); setTextSources([]); setIsOpen(false);
      onSaved(id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '자료를 정리하지 못했습니다.'); }
    finally { operationRunning.current = false; setBusy(null); }
  };

  useEffect(() => {
    if (!pendingAssignment || assignmentStarted.current === pendingAssignment) return;
    assignmentStarted.current = pendingAssignment;
    setPendingAssignment(null);
    void analyze();
  }, [pendingAssignment]);

  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-medium text-gray-800">자료로 생각 모으기</h2><p className="mt-1 text-xs leading-5 text-gray-500">누구의 생각인지 알려주면 시기별로 정리하고, 같은 달의 기록에 합쳐요.</p></div>
        <button type="button" onClick={() => setIsOpen(value => !value)} aria-expanded={isOpen} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-medium text-white"><Upload className="h-3.5 w-3.5" />{isOpen ? '접기' : '자료 추가'}</button>
      </div>
      {success && <p role="status" className="mt-3 text-xs text-emerald-700">{success}</p>}
      {isOpen && <div className="mt-5 space-y-4">
        <fieldset className="space-y-2"><legend className="text-xs font-medium text-gray-600">누구의 생각인가요?</legend><div className="flex flex-wrap gap-2">{['민아', '성모'].map(name => <button key={name} type="button" aria-pressed={selectedNames.includes(name)} disabled={!!busy} onClick={() => setSelectedNames(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])} className={`rounded-full border px-5 py-2 text-sm transition-colors ${selectedNames.includes(name) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>{name}</button>)}</div><p className="text-xs leading-5 text-gray-400">둘 다 선택할 수 있어요. 대화 자료에서는 메시지의 이름을 기준으로 생각을 구분해요.</p></fieldset>
        <label className="block space-y-2"><span className="text-xs font-medium text-gray-600">글</span><textarea disabled={!!busy || !!drafts} value={text} maxLength={20_000} onChange={event => setText(event.target.value)} onPaste={event => { const files = Array.from<File>(event.clipboardData.files); if (files.length) { event.preventDefault(); void addFiles(files); } }} placeholder={'메시지와 날짜를 붙여 넣어 주세요.\n예: 2025년 6월 · 성모: … 민아: …'} className={`${fieldClass} min-h-40 resize-y`} /></label>
        <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!drafts) void addFiles(Array.from<File>(event.dataTransfer.files)); }} className="rounded-xl border border-dashed border-gray-200 bg-white p-4">
          <input ref={fileInput} type="file" multiple accept="image/png,image/jpeg,image/webp,.txt,.md,.json" disabled={!!busy || !!drafts} className="sr-only" onChange={event => void addFiles(Array.from<File>(event.target.files || []))} aria-label="이미지 또는 글 파일 선택" />
          <button type="button" disabled={!!busy || !!drafts} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 text-sm text-gray-700 disabled:opacity-50"><ImagePlus className="h-4 w-4" />이미지 · 글 파일 선택</button>
          <p className="mt-2 text-xs leading-5 text-gray-400">이미지 최대 3장 · 글 20,000자. 첨부한 원본 이미지 대신 추출한 글을 보관해요.</p>
          {!!images.length && <ul className="mt-3 flex flex-wrap gap-3">{images.map(image => <li key={image.id} className="relative w-24"><img src={image.dataUrl} alt={image.name} className="h-24 w-24 rounded-lg border object-contain" /><button type="button" disabled={!!busy || !!drafts} onClick={() => setImages(current => current.filter(item => item.id !== image.id))} aria-label={`${image.name} 제거`} className="absolute right-1 top-1 rounded-full bg-white p-1 shadow"><X className="h-3 w-3" /></button></li>)}</ul>}
        </div>
        {drafts && <div className="space-y-3 rounded-xl border border-amber-100 bg-white p-4"><p className="text-sm text-gray-700">시기만 확인해 주세요</p>{drafts.map((draft, index) => <label key={draft.id} className="block space-y-1"><span className="text-xs text-gray-500">{draft.title}</span><input aria-label={`기록 ${index + 1} 시기`} disabled={!!busy} value={draft.eventDate || ''} onChange={event => setDrafts(current => current!.map(item => item.id === draft.id ? { ...item, eventDate: event.target.value || null } : item))} placeholder="YYYY-MM 또는 YYYY-MM-DD" className={fieldClass} /><span className="text-xs text-gray-400">{draft.dateEvidence || '자료에서 날짜를 찾지 못했어요.'}</span></label>)}<button type="button" disabled={!!busy} onClick={() => setDrafts(null)} className="text-xs text-gray-500">자료 다시 수정</button></div>}
        <div className="flex justify-end"><button type="button" disabled={!!busy || (!text.trim() && !images.length) || !spaceId} onClick={() => void analyze(!!drafts)} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy === 'files' ? '파일 준비 중' : busy === 'analyzing' ? '사람별로 정리 중' : busy === 'saving' ? '같은 시기에 반영 중' : drafts ? '확인한 시기로 정리' : 'AI로 정리해 반영'}</button></div>
        {error && <p role="alert" className="text-xs leading-5 text-amber-700">{error}</p>}
      </div>}
    </section>
  );
}
