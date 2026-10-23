import { useRef, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { ImagePlus, LoaderCircle, Upload, X, Check } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { eventStartAt, formatEventDate, validateImportDrafts } from '@/lib/flowTimeline';
import type { FlowImportDraft } from '@/types';

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

export default function FlowImport({ onSaved }: { onSaved: (id: string) => void }) {
  const { spaceId, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [textSources, setTextSources] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState<'files' | 'analyzing' | 'saving' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const batchIdentity = useRef({ id: '', createdAt: '' });
  const operationRunning = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-500 disabled:opacity-50';

  const addFiles = async (files: File[]) => {
    if (operationRunning.current || drafts || !files.length) return;
    operationRunning.current = true;
    setBusy('files'); setError(''); setSuccess('');
    try {
      const nextImages = [...images], names = [...textSources];
      let nextText = text;
      for (const file of files) {
        if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
          if (nextImages.length >= 3) throw new Error('이미지는 한 번에 3장까지 올릴 수 있어요.');
          nextImages.push({ id: crypto.randomUUID(), name: file.name, dataUrl: await prepareImage(file) });
        } else if (/\.(txt|md|json)$/i.test(file.name) || file.type === 'text/plain') {
          if (file.size > 80_000) throw new Error('텍스트 파일은 한 번에 20,000자 이내로 나누어 올려 주세요.');
          nextText += `\n\n[자료: ${file.name}]\n${await file.text()}`;
          names.push(file.name);
        } else throw new Error('PNG, JPG, WebP 이미지 또는 TXT, MD, JSON 글 파일을 올려 주세요.');
      }
      if (nextText.length > 20_000) throw new Error('글은 한 번에 20,000자까지 정리할 수 있어요.');
      setImages(nextImages); setText(nextText.trim()); setTextSources(names);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '파일을 읽지 못했습니다.'); }
    finally { operationRunning.current = false; setBusy(null); if (fileInput.current) fileInput.current.value = ''; }
  };

  const analyze = async () => {
    if (operationRunning.current || !spaceId) return;
    operationRunning.current = true;
    setBusy('analyzing'); setError(''); setSuccess('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('로그인이 필요합니다.');
      const response = await fetch('/api/flow-import', {
        method: 'POST', signal: AbortSignal.timeout(60_000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, images: images.map(image => image.dataUrl) }),
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.entries)) throw new Error(result.error || '자료를 정리하지 못했습니다.');
      if (!result.entries.length) throw new Error('정리할 생각 기록을 찾지 못했어요. 이미지의 글자가 잘 보이는지 확인하거나 내용을 붙여 넣어 주세요.');
      batchIdentity.current = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setDrafts(result.entries.map((entry: FlowImportDraft) => ({ ...entry, id: crypto.randomUUID() })));
    } catch (cause) { setError(cause instanceof Error ? cause.message : '자료를 정리하지 못했습니다.'); }
    finally { operationRunning.current = false; setBusy(null); }
  };

  const editDraft = (id: string, update: Partial<Draft>) => setDrafts(current => current?.map(draft => draft.id === id ? { ...draft, ...update } : draft) || null);
  const save = async () => {
    if (operationRunning.current || !spaceId || !drafts) return;
    operationRunning.current = true;
    setBusy('saving'); setError('');
    try {
      validateImportDrafts(drafts);
      const batch = writeBatch(db);
      const sourceNames = [...textSources, ...images.map(image => image.name)];
      if (text.trim() && !textSources.length) sourceNames.unshift('붙여 넣은 디스코드 글');
      const { id: importId, createdAt } = batchIdentity.current;
      for (const draft of drafts) {
        // Stable IDs make a retry safe even if the connection drops after a successful commit.
        const ref = doc(collection(db, 'spaces', spaceId, 'flowHistory'), `${importId}_${draft.id}`);
        const startAt = eventStartAt(draft.eventDate!);
        batch.set(ref, {
          kind: 'import', title: draft.title.trim(), summary: draft.summary.trim(),
          eventDate: draft.eventDate, startAt, endAt: startAt, createdAt,
          dateEvidence: draft.dateEvidence, sourceExcerpt: draft.sourceExcerpt,
          sourceNames, importedBy: user?.uid || '',
        });
      }
      await batch.commit();
      const firstId = `${importId}_${drafts[0].id}`;
      setSuccess(`${drafts.length}개의 기록을 해당 시기의 연대기에 저장했어요.`);
      setDrafts(null); setText(''); setImages([]); setTextSources([]); setIsOpen(false);
      onSaved(firstId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해 주세요.'); }
    finally { operationRunning.current = false; setBusy(null); }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-medium text-gray-800">디스코드 자료로 생각 모으기</h2><p className="mt-1 text-xs leading-5 text-gray-500">이미지나 글을 읽고, 자료 속 시기에 맞춰 연대기에 정리해요.</p></div>
        <button type="button" onClick={() => setIsOpen(value => !value)} aria-expanded={isOpen} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-medium text-white"><Upload className="h-3.5 w-3.5" />{isOpen ? '접기' : '자료 추가'}</button>
      </div>
      {success && <p role="status" className="mt-3 text-xs text-emerald-700">{success}</p>}
      {isOpen && (
        <div className="mt-5 space-y-4">
          {!drafts ? <>
            <label className="block space-y-2"><span className="text-xs font-medium text-gray-600">디스코드 글</span>
              <textarea disabled={!!busy} value={text} maxLength={20_000} onChange={event => setText(event.target.value)} onPaste={event => { const files = Array.from<File>(event.clipboardData.files); if (files.length) { event.preventDefault(); void addFiles(files); } }} placeholder={'디스코드 메시지와 날짜를 함께 붙여 넣어 주세요.\n예: 2025년 6월 · 그때 나눈 대화와 생각…'} className={`${fieldClass} min-h-40 resize-y`} />
            </label>
            <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addFiles(Array.from<File>(event.dataTransfer.files)); }} className="rounded-xl border border-dashed border-gray-200 bg-white p-4">
              <input ref={fileInput} type="file" multiple accept="image/png,image/jpeg,image/webp,.txt,.md,.json" disabled={!!busy} className="sr-only" onChange={event => void addFiles(Array.from<File>(event.target.files || []))} aria-label="디스코드 이미지 또는 글 파일 선택" />
              <button type="button" disabled={!!busy} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 text-sm text-gray-700 disabled:opacity-50"><ImagePlus className="h-4 w-4" />이미지 · 글 파일 선택</button>
              <p className="mt-2 text-xs leading-5 text-gray-400">파일을 끌어 놓거나 스크린샷을 붙여 넣을 수 있어요. 이미지 최대 3장 · 글 20,000자</p>
              {images.length > 0 && <ul className="mt-3 flex flex-wrap gap-3">{images.map(image => <li key={image.id} className="relative w-24"><img src={image.dataUrl} alt={image.name} className="h-24 w-24 rounded-lg border border-gray-100 object-contain" /><button type="button" disabled={!!busy} onClick={() => setImages(current => current.filter(item => item.id !== image.id))} aria-label={`${image.name} 제거`} className="absolute right-1 top-1 rounded-full bg-white p-1 shadow"><X className="h-3 w-3" /></button><p className="mt-1 truncate text-[10px] text-gray-500">{image.name}</p></li>)}</ul>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-gray-400">AI가 정리한 날짜와 내용을 확인한 뒤 저장해요.</p><button type="button" disabled={!!busy || (!text.trim() && !images.length) || !spaceId} onClick={() => void analyze()} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white disabled:opacity-40">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy === 'files' ? '파일 준비 중' : busy === 'analyzing' ? '자료 읽는 중' : 'AI로 시기별 정리'}</button></div>
          </> : <>
            <div><h3 className="text-sm font-medium text-gray-800">연대기에 넣기 전 확인해 주세요</h3><p className="mt-1 text-xs leading-5 text-gray-500">날짜가 없는 기록은 시기를 입력해 주세요. 월까지만 알면 2025-09처럼 입력할 수 있어요.</p></div>
            {drafts.map((draft, index) => <article key={draft.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-gray-400">기록 {index + 1}</span><button type="button" disabled={!!busy} onClick={() => setDrafts(current => current?.filter(item => item.id !== draft.id) || null)} aria-label={`기록 ${index + 1} 제외`} className="p-1 text-gray-400"><X className="h-4 w-4" /></button></div>
              <div className="grid gap-3 sm:grid-cols-[170px_1fr]"><label className="space-y-1"><span className="text-xs text-gray-500">내용의 시기</span><input disabled={!!busy} value={draft.eventDate || ''} onChange={event => editDraft(draft.id, { eventDate: event.target.value || null })} placeholder="YYYY-MM 또는 YYYY-MM-DD" aria-label={`기록 ${index + 1} 시기`} className={fieldClass} /><span className="block text-[11px] text-gray-400">{draft.eventDate ? formatEventDate(draft.eventDate) : '시기 확인 필요'}</span></label><label className="space-y-1"><span className="text-xs text-gray-500">제목</span><input disabled={!!busy} maxLength={100} value={draft.title} onChange={event => editDraft(draft.id, { title: event.target.value })} className={fieldClass} /></label></div>
              <label className="block space-y-1"><span className="text-xs text-gray-500">당시의 생각 정리</span><textarea disabled={!!busy} maxLength={3000} value={draft.summary} onChange={event => editDraft(draft.id, { summary: event.target.value })} className={`${fieldClass} min-h-28 resize-y`} /></label>
              <details className="text-xs text-gray-500"><summary className="cursor-pointer">읽어 온 원문 · 날짜 근거</summary><p className="my-2 whitespace-pre-wrap leading-5">{draft.dateEvidence || '날짜를 특정할 근거가 없어 직접 확인이 필요해요.'}</p><textarea aria-label={`기록 ${index + 1} 추출 원문`} disabled={!!busy} maxLength={6000} value={draft.sourceExcerpt} onChange={event => editDraft(draft.id, { sourceExcerpt: event.target.value })} className={`${fieldClass} min-h-28`} /></details>
            </article>)}
            <p className="text-[11px] leading-5 text-gray-400">정리한 내용과 추출 원문이 서재에 저장됩니다. 첨부한 원본 이미지는 저장하지 않아요.</p>
            <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={!!busy} onClick={() => setDrafts(null)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-xs text-gray-600">자료 다시 수정</button><button type="button" disabled={!!busy || !drafts.length} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white disabled:opacity-40">{busy === 'saving' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy === 'saving' ? '저장 중' : '연대기에 저장'}</button></div>
          </>}
          {error && <p role="alert" className="text-xs leading-5 text-amber-700">{error}</p>}
        </div>
      )}
    </section>
  );
}
