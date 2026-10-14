import { Modal, Select } from 'antd';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { CourseRef } from '../lib/types';

export default function AskModal({ open, onClose, course, editing, onSaved }: {
  open: boolean;
  onClose: () => void;
  course?: string;
  editing?: { _id: string; title: string; body: string } | null;
  onSaved?: () => void;
}) {
  const { t, errorText } = useLang();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseRef[]>([]);
  const [form, setForm] = useState({ course: course || '', title: '', body: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({ course: course || '', title: editing?.title || '', body: editing?.body || '' });
    if (!editing && !courses.length) api.get('/courses').then((r) => setCourses(r.data)).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/threads/${editing._id}`, { title: form.title, body: form.body });
        toast.success(t('common.saved'));
        onSaved?.();
        onClose();
      } else {
        const { data } = await api.post('/threads', form);
        toast.success(t('forum.asked'));
        onClose();
        navigate(`/forum/${data._id}`);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={620} title={editing ? t('forum.editTitle') : t('forum.askTitle')} destroyOnHidden>
      <form onSubmit={submit} className="stack" style={{ marginTop: 12 }}>
        {!editing && (
          <div>
            <label htmlFor="ask-course" className="label">{t('forum.askCourse')}</label>
            <Select
              id="ask-course"
              showSearch
              style={{ width: '100%' }}
              placeholder={t('forum.askCoursePh')}
              value={form.course || undefined}
              onChange={(v) => setForm((f) => ({ ...f, course: v }))}
              optionFilterProp="label"
              options={courses.map((c) => ({ value: c.code, label: `${c.code} · ${c.title}` }))}
            />
          </div>
        )}
        <div>
          <label htmlFor="ask-title" className="label">{t('forum.askHeading')}</label>
          <input id="ask-title" className="field" value={form.title} maxLength={150} required placeholder={t('forum.askHeadingPh')}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="ask-body" className="label">{t('forum.askBody')}</label>
          <textarea id="ask-body" className="field" value={form.body} maxLength={4000} required placeholder={t('forum.askBodyPh')}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <p className="hint">{t('review.formLang')}</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-quiet" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t('common.saving') : editing ? t('common.save') : t('forum.askSubmit')}</button>
        </div>
      </form>
    </Modal>
  );
}
