import { CalculatorOutlined, CheckCircleFilled, CloseOutlined, DeleteOutlined, PlusOutlined, WarningFilled } from '@ant-design/icons';
import { Select } from 'antd';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Confirm, Empty, Loading, PageHead } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import { currentSemester, TERMS } from '../lib/grades';
import type { CourseRef, Plan } from '../lib/types';
import { useLatest } from '../lib/useLatest';

function useCourses() {
  const [courses, setCourses] = useState<(CourseRef & { credits: number })[]>([]);
  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data)).catch(() => {});
  }, []);
  return courses;
}

function SemesterPlan({ plan, setPlan, courses }: { plan: Plan; setPlan: (p: Plan) => void; courses: CourseRef[] }) {
  const { t, num, errorText } = useLang();
  const [params, setParams] = useSearchParams();
  const year = new Date().getFullYear();
  const [term, setTerm] = useState<string>(TERMS[0]);
  const [termYear, setTermYear] = useState(year + (new Date().getMonth() >= 8 ? 1 : 0));
  const pending = useRef(params.get('add'));

  const call = async (fn: () => Promise<{ data: Plan }>, ok?: string) => {
    try {
      const { data } = await fn();
      setPlan(data);
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const latest = useLatest({ plan, call, setParams, t, errorText });

  useEffect(() => {
    const { plan, call, setParams, t, errorText } = latest.current;
    const code = pending.current;
    if (!code) return;
    pending.current = null;
    setParams({}, { replace: true });
    if (plan.records.some((r) => r.code === code && r.counted && !['F', 'I', 'W'].includes(r.grade))) return void toast.info(t('planner.alreadyPassed', { code }));
    if (plan.semesters.some((s) => s.courses.some((c) => c.code === code))) return void toast.info(t('planner.alreadyPlanned', { code }));
    (async () => {
      let first = plan.semesters[0];
      if (!first) {
        const { data } = await api.post('/planner/semesters', { name: currentSemester() }).catch((err) => {
          toast.error(errorText(err));
          return { data: null };
        });
        if (!data) return;
        first = data.semesters[0];
      }
      call(() => api.post(`/planner/semesters/${first._id}/courses`, { course: code }), `${code} → ${first.name}`);
    })();
  }, [latest]);

  const addSemester = (e: FormEvent) => {
    e.preventDefault();
    call(() => api.post('/planner/semesters', { name: `${term} ${termYear}` }));
  };

  const planned = new Set(plan.semesters.flatMap((s) => s.courses.map((c) => c.code)));
  const passed = new Set(plan.records.filter((r) => r.counted && !['F', 'I', 'W'].includes(r.grade)).map((r) => r.code));
  const options = courses.filter((c) => !planned.has(c.code) && !passed.has(c.code)).map((c) => ({ value: c.code, label: `${c.code} · ${c.title}` }));

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <form onSubmit={addSemester} className="card pad row" aria-label={t('planner.addSemester')}>
        <label htmlFor="pl-term" className="sr-only">{t('planner.term')}</label>
        <select id="pl-term" className="field" style={{ width: 'auto' }} value={term} onChange={(e) => setTerm(e.target.value)}>
          {TERMS.map((x) => <option key={x} value={x}>{t(`planner.${x.toLowerCase()}`)}</option>)}
        </select>
        <label htmlFor="pl-year" className="sr-only">{t('planner.year')}</label>
        <select id="pl-year" className="field" style={{ width: 'auto' }} value={termYear} onChange={(e) => setTermYear(Number(e.target.value))}>
          {[0, 1, 2, 3, 4].map((i) => <option key={i} value={year + i}>{year + i}</option>)}
        </select>
        <button className="btn btn-primary"><PlusOutlined /> {t('planner.addSemester')}</button>
      </form>

      {plan.semesters.length === 0 ? (
        <Empty title={t('planner.noSemesters')} text={t('planner.noSemestersText')} />
      ) : (
        <div className="grid grid-2">
          {plan.semesters.map((s) => (
            <section key={s._id} className="card pad" aria-labelledby={`sem-${s._id}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 id={`sem-${s._id}`} style={{ fontSize: '1.25rem' }}>{s.name}</h2>
                <div className="row" style={{ gap: 4 }}>
                  <span className={`tag ${s.credits > 12 ? 'amber' : 'violet'}`}>{t('planner.creditsTotal', { n: s.credits })}</span>
                  <Confirm title={t('planner.removeQ', { name: s.name })} onConfirm={() => call(() => api.delete(`/planner/semesters/${s._id}`))}>
                    <button type="button" className="icon-btn" aria-label={`${t('planner.removeSemester')}: ${s.name}`}><DeleteOutlined /></button>
                  </Confirm>
                </div>
              </div>
              {s.credits > 12 && <p className="small" style={{ color: 'var(--amber)', marginTop: 6 }}>{t('planner.heavy')}</p>}
              <ul className="list-plain" style={{ marginTop: 8 }}>
                {s.courses.map((c) => (
                  <li key={c._id} className="link-row" style={{ alignItems: 'flex-start' }}>
                    <Link to={`/courses/${c.code}`} className="code">{c.code}</Link>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block' }}>{c.title}</span>
                      {c.missing.length > 0 ? (
                        <span className="small" style={{ color: 'var(--coral)', fontWeight: 700 }}><WarningFilled /> {t('planner.missing', { codes: c.missing.join(', ') })}</span>
                      ) : (
                        <span className="small" style={{ color: 'var(--lime-ink)' }}><CheckCircleFilled /> {t('planner.ready')}</span>
                      )}
                      {c.advised.length > 0 && (
                        <span className="small muted" style={{ display: 'block' }}>{t('planner.advised', { codes: c.advised.join(', ') })}</span>
                      )}
                    </span>
                    <span className="small muted">{num(c.credits)}</span>
                    <button type="button" className="icon-btn" aria-label={`${t('common.remove')}: ${c.code}`}
                      onClick={() => call(() => api.delete(`/planner/semesters/${s._id}/courses/${c._id}`))}><CloseOutlined /></button>
                  </li>
                ))}
              </ul>
              <label htmlFor={`add-${s._id}`} className="sr-only">{t('planner.addCourse')}</label>
              <Select id={`add-${s._id}`} showSearch optionFilterProp="label" style={{ width: '100%', marginTop: 10 }} placeholder={t('planner.addCoursePh')}
                value={null} options={options} onChange={(v) => call(() => api.post(`/planner/semesters/${s._id}/courses`, { course: v }))} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Planner() {
  const { t, num } = useLang();
  const [params] = useSearchParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const courses = useCourses();

  const load = useCallback(() => {
    api.get('/planner').then((r) => setPlan(r.data)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (params.get('tab') === 'grades') return <Navigate to="/cgpa" replace />;
  if (!plan) return <div className="page"><Loading rows={3} /></div>;
  const s = plan.summary;

  return (
    <div className="page">
      <PageHead eyebrow={t('planner.eyebrow')} title={t('planner.title')} lead={t('planner.lead')} />

      <div className="card summary-strip" style={{ marginBottom: 22 }}>
        {[
          ['cgpa', s.cgpa != null ? num(s.cgpa, 2) : t('cgpa.none')],
          ['earned', num(s.credits)],
          ['attempted', num(s.attempted)],
          ['planned', num(s.planned)],
        ].map(([k, v]) => (
          <div key={k} className="stat">
            <b>{v}</b>
            <span>{t(`planner.${k}`)}</span>
          </div>
        ))}
        <div className="stat" style={{ justifyContent: 'center' }}>
          <Link to="/cgpa" className="btn btn-line btn-sm"><CalculatorOutlined /> {t('planner.toCgpa')}</Link>
        </div>
      </div>

      <SemesterPlan plan={plan} setPlan={setPlan} courses={courses} />
    </div>
  );
}
