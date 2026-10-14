import {
  ArrowLeftOutlined,
  BulbOutlined,
  CompassOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  HeartFilled,
  HeartOutlined,
  LikeFilled,
  LikeOutlined,
  LinkOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AskModal from '../components/AskModal';
import { Avatar, CodeChip, Confirm, Empty, Loading, Meter, Stars } from '../components/bits';
import ReviewForm from '../components/ReviewForm';
import ThreadRow from '../components/ThreadRow';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import { GRADES } from '../lib/grades';
import type { CourseDetail as TCourse, Note, Review, ReviewComment, Thread } from '../lib/types';
import { useAuth } from '../redux/store';

export const playlistId = (url: string) => {
  try {
    return new URL(url).searchParams.get('list') || '';
  } catch {
    return '';
  }
};

function Comments({ review }: { review: Review }) {
  const { t, ago, errorText } = useLang();
  const { token } = useAuth();
  const [items, setItems] = useState<ReviewComment[] | null>(null);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(() => {
    api.get(`/reviews/${review._id}/comments`).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [review._id]);
  useEffect(load, [load]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/reviews/${review._id}/comments`, { text });
      setText('');
      load();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const save = async () => {
    if (!editing) return;
    try {
      await api.put(`/review-comments/${editing.id}`, { text: editing.text });
      setEditing(null);
      load();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  if (items === null) return <Loading rows={1} height={40} />;

  return (
    <div style={{ marginTop: 12, paddingLeft: 14, borderLeft: '3px solid var(--line)' }}>
      {items.length === 0 && <p className="muted small">{t('review.noComments')}</p>}
      <ul className="list-plain">
        {items.map((c) => (
          <li key={c._id} style={{ padding: '10px 0', display: 'flex', gap: 10 }}>
            <Avatar name={c.author?.name} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="small"><b>{c.author?.name}</b> <span className="muted">· {ago(c.createdAt)}</span></p>
              {editing?.id === c._id ? (
                <div className="row" style={{ marginTop: 6 }}>
                  <label htmlFor={`ec-${c._id}`} className="sr-only">{t('common.edit')}</label>
                  <input id={`ec-${c._id}`} className="field" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} style={{ flex: 1 }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={save}>{t('common.save')}</button>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
                </div>
              ) : (
                <p className="prose">{c.text}</p>
              )}
            </div>
            {c.mine && editing?.id !== c._id && (
              <span className="row" style={{ gap: 0, alignSelf: 'flex-start' }}>
                <button type="button" className="icon-btn" aria-label={t('common.edit')} onClick={() => setEditing({ id: c._id, text: c.text })}><EditOutlined /></button>
                <Confirm title={t('common.sure')} onConfirm={() => api.delete(`/review-comments/${c._id}`).then(load)}>
                  <button type="button" className="icon-btn" aria-label={t('common.delete')}><DeleteOutlined /></button>
                </Confirm>
              </span>
            )}
          </li>
        ))}
      </ul>
      {token && (
        <form onSubmit={post} className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
          <label htmlFor={`nc-${review._id}`} className="sr-only">{t('review.comment')}</label>
          <input id={`nc-${review._id}`} className="field" value={text} maxLength={1000} placeholder={t('review.commentPh')} onChange={(e) => setText(e.target.value)} />
          <button className="btn btn-line" disabled={!text.trim()}>{t('review.comment')}</button>
        </form>
      )}
    </div>
  );
}

function ReviewCard({ review, onEdit, onChanged }: { review: Review; onEdit: () => void; onChanged: () => void }) {
  const { t, num, ago, errorText } = useLang();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [helpful, setHelpful] = useState({ n: review.helpfulCount, mine: review.helpedByMe });
  const [showComments, setShowComments] = useState(false);

  const vote = async () => {
    if (!token) return navigate('/login');
    try {
      const { data } = await api.post(`/reviews/${review._id}/helpful`);
      setHelpful({ n: data.helpfulCount, mine: data.helpedByMe });
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const remove = async () => {
    await api.delete(`/reviews/${review._id}`);
    toast.success(t('review.deleted'));
    onChanged();
  };

  return (
    <article className="card pad">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 12 }}>
          <Avatar name={review.author?.name} size={42} />
          <div>
            <p><b>{review.author?.name}</b> <span className="muted small">· {review.author?.department} · {ago(review.createdAt)}</span></p>
            <p className="muted small">{t('review.took', { semester: review.semester, faculty: review.faculty })}</p>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {review.grade && <span className="tag violet">{t('review.grade', { grade: review.grade })}</span>}
          <Stars value={review.rating} />
        </div>
      </div>
      <div className="row small muted" style={{ gap: 16, marginTop: 12 }}>
        <span className="row" style={{ gap: 6 }}>{t('courses.difficulty')} <Meter value={review.difficulty} label={t('courses.difficulty')} hot /></span>
        <span className="row" style={{ gap: 6 }}>{t('courses.workload')} <Meter value={review.workload} label={t('courses.workload')} hot /></span>
      </div>
      <p className="prose" style={{ marginTop: 12 }}>{review.body}</p>
      {review.tips && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'var(--lime-lo)', color: 'var(--ink)' }}>
          <p className="small" style={{ fontWeight: 700, color: 'var(--lime-ink)' }}><BulbOutlined /> {t('review.tips')}</p>
          <p className="prose" style={{ marginTop: 4 }}>{review.tips}</p>
        </div>
      )}
      <div className="row" style={{ marginTop: 14, gap: 6 }}>
        {!review.mine && (
          <button type="button" className={`btn btn-sm ${helpful.mine ? 'btn-primary' : 'btn-line'}`} onClick={vote} aria-pressed={helpful.mine}>
            {helpful.mine ? <LikeFilled /> : <LikeOutlined />} {t('review.helpful')} · {num(helpful.n)}
          </button>
        )}
        {review.mine && helpful.n > 0 && <span className="muted small">{t('review.helpfulCount', { n: helpful.n })}</span>}
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShowComments((s) => !s)} aria-expanded={showComments}>
          <MessageOutlined /> {t('review.comments')} · {num(review.comments)}
        </button>
        <span style={{ marginLeft: 'auto' }} />
        {review.mine && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={onEdit}><EditOutlined /> {t('common.edit')}</button>
        )}
        {(review.mine || user?.role === 'admin') && (
          <Confirm title={t('review.deleteQ')} onConfirm={remove}>
            <button type="button" className="btn btn-danger btn-sm"><DeleteOutlined /> {t('common.delete')}</button>
          </Confirm>
        )}
      </div>
      {showComments && <Comments review={review} />}
    </article>
  );
}

function GradeBars({ grades }: { grades: Record<string, number> }) {
  const { t, num } = useLang();
  const total = Object.values(grades).reduce((a, b) => a + b, 0);
  if (!total) return <p className="muted">{t('course.gradesNone')}</p>;
  const shown = GRADES.filter((g) => grades[g]);
  const max = Math.max(...shown.map((g) => grades[g]));
  return (
    <ul className="list-plain" style={{ display: 'grid', gap: 8 }}>
      {shown.map((g) => (
        <li key={g} className="row" style={{ gap: 10, border: 0, flexWrap: 'nowrap' }}>
          <span className="code" style={{ width: 44, justifyContent: 'center' }}>{g}</span>
          <span style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--sunken)' }} aria-hidden="true">
            <span style={{ display: 'block', height: '100%', width: `${(grades[g] / max) * 100}%`, borderRadius: 6, background: 'var(--violet)' }} />
          </span>
          <span className="small muted" style={{ width: 34, textAlign: 'right' }}>{num(grades[g])}</span>
        </li>
      ))}
    </ul>
  );
}

type Tab = 'overview' | 'reviews' | 'qa' | 'resources' | 'notes';

// programs that ask for the same thing share one line: "EEE, ECE" rather than two
const programRules = (rules: TCourse['programPrerequisites']) => {
  const byCodes = new Map<string, string[]>();
  rules.forEach((r) => byCodes.set(r.codes.join(', '), [...(byCodes.get(r.codes.join(', ')) || []), r.program]));
  return [...byCodes].map(([codes, programs]) => [codes, programs.join(', ')] as const);
};

export default function CourseDetail() {
  const { code = '' } = useParams();
  const { t, num, date } = useLang();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';

  const [course, setCourse] = useState<TCourse | null>(null);
  const [missing, setMissing] = useState(false);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [faculty, setFaculty] = useState('');
  const [sort, setSort] = useState('helpful');
  const [form, setForm] = useState<{ open: boolean; editing: Review | null }>({ open: false, editing: null });
  const [asking, setAsking] = useState(false);

  const loadCourse = useCallback(() => {
    api.get(`/courses/${code}`).then((r) => setCourse(r.data)).catch(() => setMissing(true));
  }, [code]);

  const loadReviews = useCallback(() => {
    const q = new URLSearchParams({ sort });
    if (faculty) q.set('faculty', faculty);
    api.get(`/courses/${code}/reviews?${q}`).then((r) => setReviews(r.data)).catch(() => setReviews([]));
  }, [code, sort, faculty]);

  useEffect(() => {
    setCourse(null);
    setMissing(false);
    loadCourse();
  }, [loadCourse]);
  useEffect(loadReviews, [loadReviews]);
  useEffect(() => {
    if (tab === 'qa') api.get(`/threads?course=${code}`).then((r) => setThreads(r.data)).catch(() => setThreads([]));
    if (tab === 'notes' && token) api.get(`/notes?course=${code}`).then((r) => setNotes(r.data)).catch(() => setNotes([]));
  }, [tab, code, token]);

  if (missing) {
    return (
      <div className="page">
        <Empty title={t('course.notFound')} text={t('course.notFoundText')} action={<Link to="/courses" className="btn btn-primary">{t('course.back')}</Link>} />
      </div>
    );
  }
  if (!course) return <div className="page"><Loading rows={4} /></div>;

  const s = course.stats;
  const mine = reviews?.find((r) => r.mine) || null;
  const tips = (reviews || []).filter((r) => r.tips).slice(0, 3);

  const toggleSave = async () => {
    if (!token) return navigate('/login', { state: { from: `/courses/${code}` } });
    const { data } = await api.post(`/courses/${course.code}/save`);
    setCourse({ ...course, saved: data.saved });
    toast.success(t(data.saved ? 'courses.savedToast' : 'courses.unsavedToast', { code: course.code }));
  };

  const openReview = () => {
    if (!token) return navigate('/login', { state: { from: `/courses/${code}?tab=reviews` } });
    setForm({ open: true, editing: mine });
  };

  const setTab = (next: Tab) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true });

  const tabs: [Tab, string, number?][] = [
    ['overview', t('course.tabOverview')],
    ['reviews', t('course.tabReviews'), s.reviews],
    ['qa', t('course.tabQa'), course.threads],
    ['resources', t('course.tabResources'), course.playlists.length + course.materials.length],
    ...(token ? [['notes', t('course.tabNotes')] as [Tab, string]] : []),
  ];

  return (
    <div className="page">
      <Link to="/courses" className="btn btn-quiet btn-sm" style={{ marginBottom: 14 }}><ArrowLeftOutlined /> {t('course.back')}</Link>

      <header className="card pad rise" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ minWidth: 0, flex: '1 1 380px' }}>
            <div className="row">
              <span className="code" style={{ fontSize: '1rem', padding: '5px 12px' }}>{course.code}</span>
              <span className="tag">{course.department}</span>
              <span className="tag">{t('common.credits', { n: course.credits })}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginTop: 12 }}>{course.title}</h1>
            <div className="row small" style={{ marginTop: 12, gap: 8 }}>
              <span className="muted">{t('course.prereqs')}:</span>
              {course.prerequisites.length ? course.prerequisites.map((p) => <CodeChip key={p} code={p} />) : <span className="muted">{t('course.none')}</span>}
              {course.recommended.length > 0 && (
                <>
                  <span className="muted" style={{ marginLeft: 8 }}>{t('course.recommended')}:</span>
                  {course.recommended.map((p) => <CodeChip key={p} code={p} />)}
                </>
              )}
              {course.unlocks.length > 0 && (
                <>
                  <span className="muted" style={{ marginLeft: 8 }}>{t('course.unlocks')}:</span>
                  {course.unlocks.map((u) => <CodeChip key={u.code} code={u.code} />)}
                </>
              )}
            </div>
            {programRules(course.programPrerequisites).map(([codes, programs]) => (
              <p key={programs} className="small muted" style={{ marginTop: 6 }}>
                {codes ? t('course.forProgram', { program: programs, codes }) : t('course.forProgramNone', { program: programs })}
              </p>
            ))}
          </div>
          <div className="row actions">
            <button type="button" className="btn btn-line" onClick={toggleSave} aria-pressed={course.saved}>
              {course.saved ? <HeartFilled style={{ color: 'var(--coral)' }} /> : <HeartOutlined />} {course.saved ? t('courses.unsave') : t('courses.save')}
            </button>
            {token && <Link to={`/planner?add=${course.code}`} className="btn btn-line"><CompassOutlined /> {t('course.addToPlan')}</Link>}
            <button type="button" className="btn btn-primary" onClick={openReview}><EditOutlined /> {mine ? t('course.editReview') : t('course.writeReview')}</button>
          </div>
        </div>
        <hr className="divider" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
          <div className="stat">
            <b>{s.reviews ? num(s.rating, 1) : t('common.none')}</b>
            <Stars value={s.rating} />
          </div>
          <div className="stat"><b>{s.reviews ? num(s.difficulty, 1) : t('common.none')}</b><span className="row" style={{ gap: 6 }}>{t('courses.difficulty')} <Meter value={s.difficulty} label={t('courses.difficulty')} hot /></span></div>
          <div className="stat"><b>{s.reviews ? num(s.workload, 1) : t('common.none')}</b><span className="row" style={{ gap: 6 }}>{t('courses.workload')} <Meter value={s.workload} label={t('courses.workload')} hot /></span></div>
          <div className="stat"><b>{num(s.reviews)}</b><span>{t('course.tabReviews')}</span></div>
          <div className="stat"><b>{num(course.threads)}</b><span>{t('course.tabQa')}</span></div>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label={course.code} style={{ margin: '22px 0' }}>
        {tabs.map(([key, label, count]) => (
          <button key={key} type="button" role="tab" className="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label} {count !== undefined && <span className="count">{num(count)}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="split">
          <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
            <section className="card pad">
              <h2 style={{ fontSize: '1.25rem' }}>{t('course.about')}</h2>
              <p className="prose muted" style={{ marginTop: 8 }}>{course.description || t('common.none')}</p>
            </section>
            <section className="card pad">
              <h2 style={{ fontSize: '1.25rem', marginBottom: 12 }}><BulbOutlined /> {t('course.topTips')}</h2>
              {tips.length === 0 ? <p className="muted">{t('course.noTips')}</p> : (
                <ul className="list-plain">
                  {tips.map((r) => (
                    <li key={r._id} style={{ padding: '12px 0' }}>
                      <p className="prose">{r.tips}</p>
                      <p className="small muted" style={{ marginTop: 4 }}>{r.author?.name} · {r.semester} · {r.faculty}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <aside className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
            <section className="card pad">
              <h2 style={{ fontSize: '1.15rem', marginBottom: 12 }}>{t('course.grades')}</h2>
              <GradeBars grades={course.grades} />
            </section>
            <section className="card pad">
              <h2 style={{ fontSize: '1.15rem', marginBottom: 8 }}>{t('course.faculty')}</h2>
              {course.faculties.length === 0 ? <p className="muted">{t('course.facultyNone')}</p> : (
                <ul className="list-plain">
                  {course.faculties.map((f) => (
                    <li key={f.faculty}>
                      <button type="button" className="link-row" style={{ width: '100%', border: 0, background: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                        onClick={() => { setFaculty(f.faculty); setTab('reviews'); }}>
                        <span className="code" style={{ background: 'var(--violet-lo)', color: 'var(--violet-hi)', borderColor: 'transparent' }}>{f.faculty}</span>
                        <span style={{ flex: 1 }}><Stars value={f.rating} /></span>
                        <span className="small muted">{t('common.reviews', { n: f.reviews })}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      {tab === 'reviews' && (
        <section>
          <div className="row" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
            <div className="row">
              <label htmlFor="rv-fac" className="sr-only">{t('review.faculty')}</label>
              <select id="rv-fac" className="field" style={{ width: 'auto' }} value={faculty} onChange={(e) => setFaculty(e.target.value)}>
                <option value="">{t('review.allFaculty')}</option>
                {course.faculties.map((f) => <option key={f.faculty} value={f.faculty}>{f.faculty}</option>)}
              </select>
              <label htmlFor="rv-sort" className="sr-only">{t('courses.sort')}</label>
              <select id="rv-sort" className="field" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="helpful">{t('review.sortHelpful')}</option>
                <option value="newest">{t('review.sortNewest')}</option>
                <option value="highest">{t('review.sortHighest')}</option>
                <option value="lowest">{t('review.sortLowest')}</option>
              </select>
            </div>
            <button type="button" className="btn btn-primary" onClick={openReview}>
              <EditOutlined /> {token ? (mine ? t('course.editReview') : t('course.writeReview')) : t('review.signIn')}
            </button>
          </div>
          {reviews === null ? <Loading /> : reviews.length === 0 ? (
            <Empty title={t('review.none')} text={t('review.noneText')} />
          ) : (
            <div className="stack">
              {reviews.map((r) => (
                <ReviewCard key={r._id} review={r} onEdit={() => setForm({ open: true, editing: r })} onChanged={() => { loadReviews(); loadCourse(); }} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'qa' && (
        <section className="card pad">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ fontSize: '1.25rem' }}>{t('course.tabQa')}</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => (token ? setAsking(true) : navigate('/login'))}>
              <PlusOutlined /> {t('course.askHere', { code: course.code })}
            </button>
          </div>
          {threads === null ? <Loading rows={2} height={60} /> : threads.length === 0 ? (
            <p className="muted" style={{ padding: '14px 0' }}>{t('course.noQuestions')}</p>
          ) : (
            <ul className="list-plain">{threads.map((th) => <ThreadRow key={th._id} thread={th} showCourse={false} />)}</ul>
          )}
        </section>
      )}

      {tab === 'resources' && (
        <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
          {course.playlists.length + course.materials.length === 0 && <Empty title={t('course.noResources')} />}
          {course.playlists.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 12 }}>{t('course.playlists')}</h2>
              <div className="grid grid-2">
                {course.playlists.map((p) => (
                  <Link key={p.url} to={`/watch?course=${course.code}&list=${playlistId(p.url)}`} className="card pad row" style={{ gap: 14, flexWrap: 'nowrap' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 54, height: 54, borderRadius: 14, background: 'var(--night)', color: 'var(--lime)', fontSize: 26, flexShrink: 0 }}>
                      <PlayCircleOutlined />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <b style={{ display: 'block' }}>{p.title}</b>
                      <span className="small muted">{t('course.watch')}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {course.materials.length > 0 && (
            <section className="card pad">
              <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>{t('course.materials')}</h2>
              <ul className="list-plain">
                {course.materials.map((m) => (
                  <li key={m.url}>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="link-row">
                      <LinkOutlined style={{ color: 'var(--violet)' }} />
                      <span style={{ flex: 1 }}>{m.title}</span>
                      <span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>{new URL(m.url).hostname}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === 'notes' && token && (
        <section className="card pad">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ fontSize: '1.25rem' }}>{t('course.myNotes')}</h2>
            <Link to={`/study?tab=notes&new=1&course=${course.code}`} className="btn btn-primary btn-sm"><PlusOutlined /> {t('course.newNote')}</Link>
          </div>
          {notes === null ? <Loading rows={2} height={50} /> : notes.length === 0 ? <p className="muted">{t('course.noNotes')}</p> : (
            <ul className="list-plain">
              {notes.map((n) => (
                <li key={n._id}>
                  <Link to={`/study?tab=notes&note=${n._id}`} className="link-row">
                    <FileTextOutlined style={{ color: 'var(--violet)' }} />
                    <span style={{ flex: 1 }}>{n.title}</span>
                    <span className="small muted">{date(n.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ReviewForm open={form.open} code={course.code} editing={form.editing} onClose={() => setForm({ open: false, editing: null })}
        onDone={() => { loadReviews(); loadCourse(); setTab('reviews'); }} />
      <AskModal open={asking} course={course.code} onClose={() => setAsking(false)} />
    </div>
  );
}
