import { SearchOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Empty, PageHead } from '../components/bits';
import CourseCard from '../components/CourseCard';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Course } from '../lib/types';
import { useLatest } from '../lib/useLatest';

const SORTS = [['code', 'courses.sortCode'], ['rating', 'courses.sortRating'], ['reviews', 'courses.sortReviews'], ['easiest', 'courses.sortEasiest']];

export default function Courses() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const dept = params.get('dept') || '';
  const sort = params.get('sort') || 'code';
  const [typed, setTyped] = useState(search);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [depts, setDepts] = useState<string[]>([]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.get('/departments').then((r) => setDepts(r.data)).catch(() => {});
  }, []);

  const latest = useLatest({ search, update });

  useEffect(() => {
    const id = setTimeout(() => {
      const { search, update } = latest.current;
      if (typed.trim() !== search) update('search', typed.trim());
    }, 300);
    return () => clearTimeout(id);
  }, [typed, latest]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (dept) q.set('dept', dept);
    q.set('sort', sort);
    api.get(`/courses?${q}`).then((r) => setCourses(r.data)).catch(() => setCourses([]));
  }, [search, dept, sort]);

  return (
    <div className="page">
      <PageHead eyebrow={t('courses.eyebrow')} title={t('courses.title')} lead={t('courses.lead')} />

      <div className="card pad" style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <label htmlFor="c-search" className="sr-only">{t('courses.searchLabel')}</label>
            <SearchOutlined style={{ position: 'absolute', left: 15, top: 15, color: 'var(--ink-2)' }} />
            <input id="c-search" type="search" className="field" style={{ paddingLeft: 42 }} placeholder={t('courses.searchPh')}
              value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
          <div style={{ flex: '0 1 220px' }}>
            <label htmlFor="c-sort" className="sr-only">{t('courses.sort')}</label>
            <select id="c-sort" className="field" value={sort} onChange={(e) => update('sort', e.target.value)}>
              {SORTS.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
            </select>
          </div>
        </div>
        <div className="chips" role="group" aria-label={t('courses.dept')}>
          <button type="button" className="chip" aria-pressed={!dept} onClick={() => update('dept', '')}>{t('courses.allDepts')}</button>
          {depts.map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={dept === d} onClick={() => update('dept', d)}>{d}</button>
          ))}
        </div>
      </div>

      {courses === null ? (
        <div className="grid grid-3" role="status" aria-label={t('common.loading')}>
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 200 }} />)}
        </div>
      ) : courses.length === 0 ? (
        <Empty title={t('courses.none')} text={t('courses.noneText')} />
      ) : (
        <>
          <p className="muted small" style={{ marginBottom: 12 }} aria-live="polite">{t('courses.count', { n: courses.length })}</p>
          <div className="grid grid-3">
            {courses.map((c) => (
              <CourseCard key={c._id} course={c} onSaved={(saved) => setCourses((list) => list!.map((x) => (x._id === c._id ? { ...x, saved } : x)))} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
