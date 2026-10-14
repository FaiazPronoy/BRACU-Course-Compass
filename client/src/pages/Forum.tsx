import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AskModal from '../components/AskModal';
import { Empty, Loading, PageHead } from '../components/bits';
import ThreadRow from '../components/ThreadRow';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Thread } from '../lib/types';
import { useAuth } from '../redux/store';

export default function Forum() {
  const { t, num } = useLang();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [busy, setBusy] = useState<{ code: string; title: string; threads: number; open: number }[]>([]);
  const [typed, setTyped] = useState(params.get('search') || '');
  const [asking, setAsking] = useState(params.get('ask') === '1');

  const status = params.get('status') || '';
  const course = params.get('course') || '';
  const sort = params.get('sort') || 'newest';
  const search = params.get('search') || '';
  const mine = params.get('mine') === '1';

  // several filters can change in one click, so they are applied together
  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete('ask');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.get('/threads/courses').then((r) => setBusy(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setTimeout(() => typed.trim() !== search && set({ search: typed.trim() }), 300);
    return () => clearTimeout(id);
  }, [typed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setThreads(null);
    const q = new URLSearchParams({ sort });
    if (status) q.set('status', status);
    if (course) q.set('course', course);
    if (search) q.set('search', search);
    if (mine) q.set('mine', '1');
    api.get(`/threads?${q}`).then((r) => setThreads(r.data)).catch(() => setThreads([]));
  }, [status, course, sort, search, mine]);

  const ask = () => (token ? setAsking(true) : navigate('/login', { state: { from: '/forum?ask=1' } }));

  const filters: [string, string][] = [['', 'forum.all'], ['open', 'forum.open'], ['resolved', 'forum.resolved']];

  return (
    <div className="page">
      <PageHead eyebrow={t('forum.eyebrow')} title={t('forum.title')} lead={t('forum.lead')}
        action={<button type="button" className="btn btn-primary" onClick={ask}><PlusOutlined /> {t('forum.ask')}</button>} />

      <div className="split">
        <section>
          <div className="card pad" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <label htmlFor="f-search" className="sr-only">{t('forum.searchPh')}</label>
              <SearchOutlined style={{ position: 'absolute', left: 15, top: 15, color: 'var(--ink-2)' }} />
              <input id="f-search" type="search" className="field" style={{ paddingLeft: 42 }} placeholder={t('forum.searchPh')}
                value={typed} onChange={(e) => setTyped(e.target.value)} />
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="chips" role="group" aria-label={t('forum.eyebrow')}>
                {filters.map(([v, k]) => (
                  <button key={k} type="button" className="chip" aria-pressed={status === v && !mine} onClick={() => set({ mine: '', status: v })}>{t(k)}</button>
                ))}
                {token && <button type="button" className="chip" aria-pressed={mine} onClick={() => set({ mine: mine ? '' : '1', status: '' })}>{t('forum.mine')}</button>}
              </div>
              <div>
                <label htmlFor="f-sort" className="sr-only">{t('courses.sort')}</label>
                <select id="f-sort" className="field" style={{ width: 'auto', minHeight: 40 }} value={sort} onChange={(e) => set({ sort: e.target.value })}>
                  <option value="newest">{t('forum.sortNew')}</option>
                  <option value="top">{t('forum.sortTop')}</option>
                  <option value="unanswered">{t('forum.sortUnanswered')}</option>
                </select>
              </div>
            </div>
            {course && (
              <p className="row small">
                <span className="code">{course}</span>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => set({ course: '' })}>{t('forum.anyCourse')}</button>
              </p>
            )}
          </div>

          {threads === null ? <Loading rows={4} height={70} /> : threads.length === 0 ? (
            <Empty title={t('forum.none')} text={t('forum.noneText')} action={<button type="button" className="btn btn-primary" onClick={ask}>{t('forum.ask')}</button>} />
          ) : (
            <ul className="card list-plain" style={{ padding: '4px 12px' }}>
              {threads.map((th) => <ThreadRow key={th._id} thread={th} />)}
            </ul>
          )}
        </section>

        <aside className="card pad">
          <h2 style={{ fontSize: '1.15rem', marginBottom: 8 }}>{t('forum.busy')}</h2>
          <ul className="list-plain">
            {busy.map((c) => (
              <li key={c.code}>
                <Link to={`/forum?course=${c.code}`} className="link-row" aria-current={course === c.code ? 'true' : undefined}>
                  <span className="code">{c.code}</span>
                  <span style={{ flex: 1, minWidth: 0 }} className="small">{c.title}</span>
                  <span className="small muted">{num(c.threads)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <AskModal open={asking} course={course || undefined} onClose={() => { setAsking(false); set({ ask: '' }); }} />
    </div>
  );
}
