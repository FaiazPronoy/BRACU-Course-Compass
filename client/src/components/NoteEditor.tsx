import { CopyOutlined, DeleteOutlined, PrinterOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Note } from '../lib/types';
import { Confirm } from './bits';

const toolbar = [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['code-block', 'link'], ['clean']];

// Saves on its own a moment after you stop typing, so nothing is lost when
// you close the tab mid-lecture.
export default function NoteEditor({ note, onSaved, onDeleted, compact = false }: {
  note: Note;
  onSaved?: (n: Note) => void;
  onDeleted?: () => void;
  compact?: boolean;
}) {
  const { t, date, errorText } = useLang();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [state, setState] = useState<'saved' | 'dirty' | 'saving'>('saved');
  const [savedAt, setSavedAt] = useState(note.updatedAt);
  const first = useRef(true);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSavedAt(note.updatedAt);
    setState('saved');
    first.current = true;
  }, [note._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState('dirty');
    const id = setTimeout(async () => {
      setState('saving');
      try {
        const { data } = await api.put(`/notes/${note._id}`, { title: title.trim() || t('notes.untitled'), content });
        setSavedAt(data.updatedAt);
        setState('saved');
        onSaved?.(data);
      } catch (err) {
        setState('dirty');
        toast.error(errorText(err));
      }
    }, 900);
    return () => clearTimeout(id);
  }, [title, content]); // eslint-disable-line react-hooks/exhaustive-deps

  // warn before leaving with something unsaved
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (state !== 'saved') e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state]);

  const plainText = () => {
    const div = document.createElement('div');
    div.innerHTML = content;
    return div.innerText;
  };

  const copy = async () => {
    await navigator.clipboard.writeText(`${title}\n\n${plainText()}`);
    toast.success(t('notes.copied'));
  };

  // the browser's own print dialog handles Bangla text and "Save as PDF"
  // properly, which a canvas screenshot into jsPDF did not
  const print = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700&family=Anek+Bangla:wght@400;700&display=swap">
      <style>body{font-family:'Atkinson Hyperlegible Next','Anek Bangla',sans-serif;max-width:720px;margin:40px auto;line-height:1.6;color:#17122e}
      h1{font-size:26px;border-bottom:3px solid #c4f04a;padding-bottom:8px}pre{background:#f4ecff;padding:10px;border-radius:8px}</style></head>
      <body><h1>${title.replace(/</g, '&lt;')}</h1>${content}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const remove = async () => {
    await api.delete(`/notes/${note._id}`);
    toast.success(t('notes.deleted'));
    onDeleted?.();
  };

  return (
    <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <label htmlFor={`nt-${note._id}`} className="sr-only">{t('notes.titlePh')}</label>
        <input id={`nt-${note._id}`} className="field" value={title} maxLength={120} placeholder={t('notes.titlePh')} onChange={(e) => setTitle(e.target.value)}
          style={{ flex: '1 1 240px', fontFamily: 'var(--display)', fontWeight: 700, fontSize: compact ? '1.1rem' : '1.3rem' }} />
        <span className="small muted" aria-live="polite" style={{ minWidth: 110, textAlign: 'right' }}>
          {state === 'saving' ? t('notes.saving') : state === 'dirty' ? t('notes.unsaved') : t('notes.savedAt', { time: date(savedAt, 'h:mm A') })}
        </span>
      </div>
      <ReactQuill theme="snow" value={content} onChange={setContent} modules={{ toolbar }} placeholder={t('notes.editorPh')} />
      <div className="row">
        <button type="button" className="btn btn-line btn-sm" onClick={print}><PrinterOutlined /> {t('notes.print')}</button>
        <button type="button" className="btn btn-line btn-sm" onClick={copy}><CopyOutlined /> {t('notes.copy')}</button>
        <span style={{ marginLeft: 'auto' }} />
        <Confirm title={t('notes.deleteQ')} onConfirm={remove}>
          <button type="button" className="btn btn-danger btn-sm"><DeleteOutlined /> {t('common.delete')}</button>
        </Confirm>
      </div>
    </div>
  );
}
