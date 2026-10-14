import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Modal, Select } from 'antd';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, CodeChip, Confirm, Loading, PageHead } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Course, CourseRef, Link as TLink } from '../lib/types';
import { useAuth } from '../redux/store';

interface Overview {
  counts: Record<string, number>;
  recentReviews: { _id: string; author: { name: string }; course: CourseRef; faculty: string; body: string; createdAt: string }[];
  recentThreads: { _id: string; author: { name: string }; course: CourseRef; title: string; createdAt: string }[];
  unreviewed: CourseRef[];
}

function OverviewTab() {
  const { t, num, ago } = useLang();
  const [data, setData] = useState<Overview | null>(null);
  const load = useCallback(() => {
    api.get('/admin/overview').then((r) => setData(r.data)).catch(() => {});
  }, []);
  useEffect(load, [load]);
  if (!data) return <Loading rows={3} />;

  const c = data.counts;
  const remove = (path: string) => api.delete(path).then(() => { toast.success(t('admin.removed')); load(); });

  return (
    <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      <div className="grid grid-stats">
        {([['users', c.users, 'newUsers', c.newUsers], ['courses', c.courses], ['reviews', c.reviews, 'newReviews', c.newReviews], ['threads', c.threads, 'unanswered', c.unanswered]] as [string, number, string?, number?][]).map(([k, v, extraKey, extra]) => (
          <div key={k} className="card pad stat">
            <b>{num(v)}</b>
            <span>{t(`admin.${k}`)}</span>
            {extraKey && <span className="tag lime" style={{ justifySelf: 'start', marginTop: 4 }}>{num(extra || 0)} {t(`admin.${extraKey}`)}</span>}
          </div>
        ))}
      </div>
      <div className="grid grid-2">
        <section className="card pad">
          <h2 style={{ fontSize: '1.2rem', marginBottom: 6 }}>{t('admin.recentReviews')}</h2>
          <ul className="list-plain">
            {data.recentReviews.map((r) => (
              <li key={r._id} className="link-row" style={{ alignItems: 'flex-start' }}>
                {r.course && <CodeChip code={r.course.code} />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.body}</span>
                  <span className="small muted">{r.author?.name} · {r.faculty} · {ago(r.createdAt)}</span>
                </span>
                <Confirm title={t('review.deleteQ')} onConfirm={() => remove(`/reviews/${r._id}`)}>
                  <button type="button" className="btn btn-danger btn-sm">{t('admin.moderate')}</button>
                </Confirm>
              </li>
            ))}
          </ul>
        </section>
        <section className="card pad">
          <h2 style={{ fontSize: '1.2rem', marginBottom: 6 }}>{t('admin.recentThreads')}</h2>
          <ul className="list-plain">
            {data.recentThreads.map((th) => (
              <li key={th._id} className="link-row" style={{ alignItems: 'flex-start' }}>
                {th.course && <CodeChip code={th.course.code} />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/forum/${th._id}`} style={{ display: 'block', color: 'inherit' }}>{th.title}</Link>
                  <span className="small muted">{th.author?.name} · {ago(th.createdAt)}</span>
                </span>
                <Confirm title={t('forum.deleteQ')} onConfirm={() => remove(`/threads/${th._id}`)}>
                  <button type="button" className="btn btn-danger btn-sm">{t('admin.moderate')}</button>
                </Confirm>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="card pad">
        <h2 style={{ fontSize: '1.2rem', marginBottom: 10 }}>{t('admin.unreviewed')}</h2>
        {data.unreviewed.length === 0 ? <p className="muted">{t('admin.allReviewed')}</p> : (
          <div className="chips">{data.unreviewed.map((c) => <CodeChip key={c._id} code={c.code} />)}</div>
        )}
      </section>
    </div>
  );
}

type Draft = {
  code: string; title: string; department: string; credits: number; description: string;
  prerequisites: string[]; recommended: string[]; programPrerequisites: Course['programPrerequisites'];
  playlists: TLink[]; materials: TLink[];
};
const empty: Draft = { code: '', title: '', department: 'CSE', credits: 3, description: '', prerequisites: [], recommended: [], programPrerequisites: [], playlists: [], materials: [] };

function LinkList({ label, value, onChange }: { label: string; value: TLink[]; onChange: (v: TLink[]) => void }) {
  const { t } = useLang();
  const set = (i: number, k: keyof TLink, v: string) => onChange(value.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label">{label}</legend>
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        {value.map((l, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="field" aria-label={`${label} ${i + 1}: ${t('admin.linkTitle')}`} placeholder={t('admin.linkTitle')} value={l.title} onChange={(e) => set(i, 'title', e.target.value)} />
            <input className="field" aria-label={`${label} ${i + 1}: ${t('admin.linkUrl')}`} placeholder="https://" value={l.url} onChange={(e) => set(i, 'url', e.target.value)} />
            <button type="button" className="icon-btn" aria-label={`${t('common.remove')} ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><MinusCircleOutlined /></button>
          </div>
        ))}
        <button type="button" className="btn btn-quiet btn-sm" style={{ justifySelf: 'start' }} onClick={() => onChange([...value, { title: '', url: '' }])}>
          <PlusOutlined /> {t('admin.addLink')}
        </button>
      </div>
    </fieldset>
  );
}

function CoursesTab() {
  const { t, errorText } = useLang();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/courses').then((r) => setCourses(r.data)).catch(() => setCourses([]));
  }, []);
  useEffect(load, [load]);

  const open = (c?: Course) => {
    setError('');
    setEditing(c ? { id: c._id, draft: { code: c.code, title: c.title, department: c.department, credits: c.credits, description: c.description,
      prerequisites: c.prerequisites, recommended: c.recommended || [], programPrerequisites: c.programPrerequisites || [],
      playlists: c.playlists, materials: c.materials } } : { id: null, draft: empty });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    try {
      const body = { ...editing.draft, playlists: editing.draft.playlists.filter((l) => l.url), materials: editing.draft.materials.filter((l) => l.url) };
      if (editing.id) await api.put(`/courses/${editing.id}`, body);
      else await api.post('/courses', body);
      toast.success(t('admin.courseSaved', { code: body.code.toUpperCase() }));
      setEditing(null);
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  if (!courses) return <Loading />;
  const shown = courses.filter((c) => `${c.code} ${c.title}`.toLowerCase().includes(filter.toLowerCase()));
  const d = editing?.draft;
  const setD = (patch: Partial<Draft>) => setEditing((x) => x && { ...x, draft: { ...x.draft, ...patch } });

  return (
    <section>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '0 1 340px' }}>
          <label htmlFor="ad-filter" className="sr-only">{t('admin.filterCourses')}</label>
          <SearchOutlined style={{ position: 'absolute', left: 15, top: 15, color: 'var(--ink-2)' }} />
          <input id="ad-filter" type="search" className="field" style={{ paddingLeft: 42 }} placeholder={t('admin.filterCourses')} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => open()}><PlusOutlined /> {t('admin.addCourse')}</button>
      </div>
      <ul className="card list-plain" style={{ padding: '4px 14px' }}>
        {shown.map((c) => (
          <li key={c._id} className="link-row">
            <CodeChip code={c.code} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block' }}>{c.title}</span>
              <span className="small muted">{c.department} · {t('common.credits', { n: c.credits })} · {t('common.reviews', { n: c.stats.reviews })}</span>
            </span>
            <button type="button" className="icon-btn" aria-label={t('admin.editCourse', { code: c.code })} onClick={() => open(c)}><EditOutlined /></button>
            <Confirm title={t('admin.deleteCourseQ', { code: c.code })} onConfirm={() => api.delete(`/courses/${c._id}`).then(() => { toast.success(t('admin.courseDeleted', { code: c.code })); load(); })}>
              <button type="button" className="icon-btn" aria-label={`${t('common.delete')}: ${c.code}`}><DeleteOutlined /></button>
            </Confirm>
          </li>
        ))}
      </ul>

      <Modal open={!!editing} onCancel={() => setEditing(null)} footer={null} width={720} destroyOnHidden
        title={editing?.id ? t('admin.editCourse', { code: d?.code || '' }) : t('admin.addCourse')}>
        {d && (
          <form onSubmit={save} className="stack" style={{ marginTop: 12 }}>
            <div className="form-grid">
              <div>
                <label htmlFor="cf-code" className="label">{t('admin.code')}</label>
                <input id="cf-code" className="field" required maxLength={6} style={{ fontFamily: 'var(--mono)' }} value={d.code} onChange={(e) => setD({ code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label htmlFor="cf-dept" className="label">{t('profile.department')}</label>
                <input id="cf-dept" className="field" required maxLength={6} value={d.department} onChange={(e) => setD({ department: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label htmlFor="cf-credits" className="label">{t('admin.credits')}</label>
                <input id="cf-credits" type="number" min={0} max={6} className="field" value={d.credits} onChange={(e) => setD({ credits: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label htmlFor="cf-title" className="label">{t('admin.courseTitle')}</label>
              <input id="cf-title" className="field" required maxLength={120} value={d.title} onChange={(e) => setD({ title: e.target.value })} />
            </div>
            <div>
              <label htmlFor="cf-desc" className="label">{t('admin.description')}</label>
              <textarea id="cf-desc" className="field" maxLength={2000} value={d.description} onChange={(e) => setD({ description: e.target.value })} />
            </div>
            <div>
              <label htmlFor="cf-pre" className="label">{t('admin.prereqs')}</label>
              <Select id="cf-pre" mode="multiple" style={{ width: '100%' }} placeholder={t('admin.prereqsPh')} value={d.prerequisites}
                onChange={(v) => setD({ prerequisites: v })} options={courses.filter((c) => c.code !== d.code).map((c) => ({ value: c.code, label: c.code }))} />
            </div>
            <div>
              <label htmlFor="cf-rec" className="label">{t('admin.recommended')}</label>
              <Select id="cf-rec" mode="multiple" style={{ width: '100%' }} placeholder={t('admin.prereqsPh')} value={d.recommended}
                onChange={(v) => setD({ recommended: v })} options={courses.filter((c) => c.code !== d.code).map((c) => ({ value: c.code, label: c.code }))} />
            </div>
            <LinkList label={t('admin.playlists')} value={d.playlists} onChange={(v) => setD({ playlists: v })} />
            <LinkList label={t('admin.materials')} value={d.materials} onChange={(v) => setD({ materials: v })} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
              <button className="btn btn-primary">{t('admin.saveCourse')}</button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}

interface Account { _id: string; name: string; email: string; role: 'user' | 'admin'; department: string; reviews: number; createdAt: string }

function UsersTab() {
  const { t, date, errorText } = useLang();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<Account[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    const id = setTimeout(() => {
      api.get(`/admin/users?search=${encodeURIComponent(q)}`).then((r) => setUsers(r.data)).catch(() => setUsers([]));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const setRole = async (u: Account, role: 'user' | 'admin') => {
    try {
      await api.patch(`/admin/users/${u._id}/role`, { role });
      setUsers((list) => list!.map((x) => (x._id === u._id ? { ...x, role } : x)));
      toast.success(t('admin.roleChanged'));
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  return (
    <section>
      <div style={{ position: 'relative', maxWidth: 380, marginBottom: 14 }}>
        <label htmlFor="ad-users" className="sr-only">{t('admin.searchUsers')}</label>
        <SearchOutlined style={{ position: 'absolute', left: 15, top: 15, color: 'var(--ink-2)' }} />
        <input id="ad-users" type="search" className="field" style={{ paddingLeft: 42 }} placeholder={t('admin.searchUsers')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!users ? <Loading /> : (
        <ul className="card list-plain" style={{ padding: '4px 14px' }}>
          {users.map((u) => (
            <li key={u._id} className="link-row">
              <Avatar name={u.name} size={36} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700 }}>{u.name}</span>
                <span className="small muted" style={{ overflowWrap: 'anywhere' }}>{u.email} · {u.department} · {t('admin.joined')} {date(u.createdAt)} · {t('common.reviews', { n: u.reviews })}</span>
              </span>
              <span className={`tag ${u.role === 'admin' ? 'violet' : ''}`}>{u.role === 'admin' ? t('admin.adminRole') : t('admin.student')}</span>
              {u._id !== me?._id && (
                <button type="button" className="btn btn-line btn-sm" onClick={() => setRole(u, u.role === 'admin' ? 'user' : 'admin')}>
                  {u.role === 'admin' ? t('admin.makeStudent') : t('admin.makeAdmin')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Admin() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  return (
    <div className="page">
      <PageHead eyebrow={t('admin.eyebrow')} title={t('admin.title')} />
      <div className="tabs" role="tablist" style={{ marginBottom: 22 }}>
        {[['overview', 'admin.tabOverview'], ['courses', 'admin.tabCourses'], ['users', 'admin.tabUsers']].map(([k, label]) => (
          <button key={k} type="button" role="tab" className="tab" aria-selected={tab === k} onClick={() => setParams(k === 'overview' ? {} : { tab: k }, { replace: true })}>{t(label)}</button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'courses' && <CoursesTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  );
}
