import { Modal, Rate } from 'antd';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import { GRADES, recentSemesters } from '../lib/grades';
import type { Review } from '../lib/types';

const blank = { faculty: '', semester: recentSemesters()[1], rating: 0, difficulty: 0, workload: 0, grade: '', body: '', tips: '' };

export default function ReviewForm({ open, code, editing, onClose, onDone }: {
  open: boolean; code: string; editing: Review | null; onClose: () => void; onDone: () => void;
}) {
  const { t, errorText } = useLang();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(editing ? {
      faculty: editing.faculty, semester: editing.semester, rating: editing.rating, difficulty: editing.difficulty,
      workload: editing.workload, grade: editing.grade, body: editing.body, tips: editing.tips,
    } : blank);
  }, [open, editing]);

  const set = (k: keyof typeof blank) => (v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.rating || !form.difficulty || !form.workload) {
      setError(errorText({ response: { data: { message: 'Pick 1 to 5.' } } }));
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing) await api.put(`/reviews/${editing._id}`, form);
      else await api.post(`/courses/${code}/reviews`, form);
      toast.success(editing ? t('review.updated') : t('review.posted'));
      onDone();
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const scale = (key: 'rating' | 'difficulty' | 'workload', label: string, low?: string, high?: string) => (
    <div>
      <span className="label" id={`lbl-${key}`}>{label}</span>
      <Rate value={form[key]} onChange={set(key)} aria-labelledby={`lbl-${key}`} style={{ fontSize: 24 }} />
      {low && <p className="hint">1 = {low}, 5 = {high}</p>}
    </div>
  );

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={640} title={editing ? t('course.editReview') : `${t('course.writeReview')}: ${code}`} destroyOnHidden>
      <form onSubmit={submit} className="stack" style={{ '--gap': '18px', marginTop: 12 } as React.CSSProperties}>
        <div className="form-grid">
          <div>
            <label htmlFor="rv-faculty" className="label">{t('review.formFaculty')}</label>
            <input id="rv-faculty" className="field" value={form.faculty} maxLength={6} required
              onChange={(e) => set('faculty')(e.target.value.toUpperCase())} style={{ fontFamily: 'var(--mono)' }} />
            <p className="hint">{t('review.formFacultyHint')}</p>
          </div>
          <div>
            <label htmlFor="rv-sem" className="label">{t('review.formSemester')}</label>
            <select id="rv-sem" className="field" value={form.semester} onChange={(e) => set('semester')(e.target.value)}>
              {recentSemesters(16).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rv-grade" className="label">{t('review.formGrade')}</label>
            <select id="rv-grade" className="field" value={form.grade} onChange={(e) => set('grade')(e.target.value)}>
              <option value="">{t('review.formGradeNone')}</option>
              {GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid">
          {scale('rating', t('review.formRating'))}
          {scale('difficulty', t('review.formDifficulty'), t('review.easy'), t('review.hard'))}
          {scale('workload', t('review.formWorkload'), t('review.light'), t('review.heavy'))}
        </div>
        <div>
          <label htmlFor="rv-body" className="label">{t('review.formBody')}</label>
          <textarea id="rv-body" className="field" value={form.body} maxLength={2000} required placeholder={t('review.formBodyPh')}
            onChange={(e) => set('body')(e.target.value)} />
        </div>
        <div>
          <label htmlFor="rv-tips" className="label">{t('review.formTips')} <span className="muted" style={{ fontWeight: 400 }}>({t('common.optional')})</span></label>
          <textarea id="rv-tips" className="field" style={{ minHeight: 90 }} value={form.tips} maxLength={1000} placeholder={t('review.formTipsPh')}
            onChange={(e) => set('tips')(e.target.value)} />
          <p className="hint">{t('review.formLang')}</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-quiet" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t('common.saving') : t('review.submit')}</button>
        </div>
      </form>
    </Modal>
  );
}
