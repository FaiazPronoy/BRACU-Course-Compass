import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  CalculatorOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  EditOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  StarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, CodeChip, Loading, Meter, Stars } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { CalendarEvent, Course, CourseRef, Note, Review, Todo } from '../lib/types';
import { useAuth } from '../redux/store';

function CompassArt() {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-hidden="true" style={{ width: '100%', maxWidth: 360 }}>
      <circle cx="160" cy="160" r="150" fill="var(--surface)" stroke="var(--line-2)" strokeWidth="2" />
      <circle cx="160" cy="160" r="118" fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 8" />
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const long = i % 9 === 0;
        const r1 = long ? 128 : 136;
        return (
          <line key={i} x1={160 + Math.sin(a) * r1} y1={160 - Math.cos(a) * r1} x2={160 + Math.sin(a) * 146} y2={160 - Math.cos(a) * 146}
            stroke={long ? 'var(--violet)' : 'var(--line-2)'} strokeWidth={long ? 4 : 2} strokeLinecap="round" />
        );
      })}
      {[['N', 160, 44], ['E', 280, 166], ['S', 160, 288], ['W', 40, 166]].map(([l, x, y]) => (
        <text key={l} x={x} y={y} textAnchor="middle" fontFamily="var(--mono)" fontWeight="700" fontSize="16" fill="var(--ink-2)">{l}</text>
      ))}
      <g transform="rotate(40 160 160)">
        <path d="M160 58 L176 160 L160 262 L144 160 Z" fill="var(--ink)" />
        <path d="M160 58 L176 160 L144 160 Z" fill="var(--lime)" stroke="var(--ink)" strokeWidth="2" />
      </g>
      <circle cx="160" cy="160" r="12" fill="var(--violet)" stroke="var(--surface)" strokeWidth="4" />
      {[['CSE221', 212, 92, -8], ['MAT216', 62, 108, 6], ['CSE370', 214, 236, 5], ['PHY111', 60, 222, -5]].map(([c, x, y, r]) => (
        <g key={c as string} transform={`rotate(${r} ${x} ${y})`}>
          <rect x={(x as number) - 38} y={(y as number) - 14} width="76" height="28" rx="8" fill="var(--lime-lo)" stroke="var(--lime)" />
          <text x={x} y={(y as number) + 5} textAnchor="middle" fontFamily="var(--mono)" fontWeight="700" fontSize="13" fill="var(--lime-ink)">{c}</text>
        </g>
      ))}
    </svg>
  );
}

function ReviewSnippet({ r }: { r: Review }) {
  const { t, ago } = useLang();
  const course = r.course as CourseRef;
  return (
    <article className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <CodeChip code={course.code} />
        <Stars value={r.rating} />
      </div>
      <p className="prose" style={{ flex: 1, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.body}</p>
      <div className="row small muted">
        <span className="tag opinion">{t('review.opinion')}</span>
      </div>
      <div className="row small muted">
        <Avatar name={r.author?.name} size={28} />
        <span>{r.author?.name}</span>
        <span>· {ago(r.createdAt)}</span>
        <Link to={`/faculty/${r.faculty}`} className="tag" style={{ marginLeft: 'auto', position: 'relative', zIndex: 1 }}>{r.faculty}</Link>
      </div>
      <span className="sr-only">{t('review.took', { semester: r.semester, faculty: r.faculty })}</span>
    </article>
  );
}

function Landing() {
  const { t, num } = useLang();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [depts, setDepts] = useState<string[]>([]);
  const [recent, setRecent] = useState<Review[] | null>(null);
  const [top, setTop] = useState<Course[] | null>(null);

  useEffect(() => {
    api.get('/courses?sort=reviews').then((r) => setTop(r.data.slice(0, 6))).catch(() => setTop([]));
    api.get('/departments').then((r) => setDepts(r.data)).catch(() => {});
    api.get('/reviews/recent?limit=6').then((r) => setRecent(r.data)).catch(() => setRecent([]));
  }, []);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const code = q.trim().toUpperCase().replace(/\s+/g, '');
    if (/^[A-Z]{3}\d{3}$/.test(code)) return navigate(`/courses/${code}`);
    const next = new URLSearchParams();
    if (q.trim()) next.set('search', q.trim());
    if (dept) next.set('dept', dept);
    navigate(`/courses?${next}`);
  };

  const features = [
    { icon: <StarOutlined />, h: 'landing.f1', p: 'landing.f1t', to: '/courses' },
    { icon: <MessageOutlined />, h: 'landing.f2', p: 'landing.f2t', to: '/forum' },
    { icon: <CompassOutlined />, h: 'landing.f3', p: 'landing.f3t', to: '/planner' },
    { icon: <CalculatorOutlined />, h: 'landing.f4', p: 'landing.f4t', to: '/cgpa' },
    { icon: <CalendarOutlined />, h: 'landing.f5', p: 'landing.f5t', to: '/study' },
    { icon: <FileTextOutlined />, h: 'landing.f6', p: 'landing.f6t', to: '/courses' },
  ];

  return (
    <>
      <section className="page home-split">
        <div className="home-search">
        <h1>{t('landing.title')}</h1>
        <p className="muted home-lead">{t('landing.lead')}</p>

        <form onSubmit={search} role="search" className="search-panel">
          <div className="search-main">
            <label htmlFor="hero-search" className="sr-only">{t('landing.searchLabel')}</label>
            <SearchOutlined aria-hidden="true" />
            <input id="hero-search" className="field" placeholder={t('landing.searchPh')}
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <label htmlFor="hero-dept" className="sr-only">{t('courses.dept')}</label>
          <select id="hero-dept" className="field" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">{t('courses.allDepts')}</option>
            {depts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="btn btn-primary">{t('landing.go')}</button>
        </form>

        <div className="chips quick" aria-label={t('landing.quick')}>
          <span className="muted small">{t('landing.quick')}</span>
          <Link className="chip" to="/courses?sort=easiest">{t('courses.sortEasiest')}</Link>
          <Link className="chip" to="/courses?sort=reviews">{t('courses.sortReviews')}</Link>
          {['CSE', 'MAT', 'PHY', 'ENG'].filter((d) => depts.includes(d)).map((d) => (
            <Link key={d} className="chip" to={`/courses?dept=${d}`}>{d}</Link>
          ))}
        </div>
        </div>

        <div className="center rise home-art">
          <CompassArt />
        </div>
      </section>

      <section className="page" style={{ paddingTop: 0 }}>
        <aside style={{ maxWidth: 820 }} className="card top-courses" aria-labelledby="top-title">
          <div className="top-head">
            <h2 id="top-title">{t('landing.topTitle')}</h2>
            <Link to="/courses?sort=reviews" className="small">{t('landing.recentAll')}</Link>
          </div>
          {top === null ? <Loading rows={4} height={36} /> : (
            <table className="top-table">
              <thead>
                <tr>
                  <th scope="col">{t('landing.colCourse')}</th>
                  <th scope="col">{t('courses.rating')}</th>
                  <th scope="col">{t('courses.difficulty')}</th>
                </tr>
              </thead>
              <tbody>
                {top.map((c) => (
                  <tr key={c._id}>
                    <th scope="row">
                      <Link to={`/courses/${c.code}`}><span className="code">{c.code}</span> <span className="top-name">{c.title}</span></Link>
                    </th>
                    <td>{c.stats.reviews ? <><b>{num(c.stats.rating, 1)}</b> <span className="muted small">({num(c.stats.reviews)})</span></> : <span className="muted small">{t('courses.noReviews')}</span>}</td>
                    <td>{c.stats.reviews ? <Meter value={c.stats.difficulty} label={t('courses.difficulty')} hot /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </aside>
      </section>

      <section className="page" style={{ paddingTop: 0 }}>
        <div className="page-head with-action">
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)' }}>{t('landing.recentTitle')}</h2>
          <Link to="/courses" className="btn btn-line">{t('landing.recentAll')} <ArrowRightOutlined /></Link>
        </div>
        {recent === null ? <Loading rows={2} height={160} /> : (
          <div className="grid grid-3">{recent.map((r) => <ReviewSnippet key={r._id} r={r} />)}</div>
        )}
      </section>

      <section className="page" style={{ paddingTop: 0 }}>
        <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', marginBottom: 16 }}>{t('landing.featTitle')}</h2>
        <ul className="feature-rows">
          {features.map((f) => (
            <li key={f.h}>
              <Link to={f.to}>
                <span className="feature-icon" aria-hidden="true">{f.icon}</span>
                <span><b>{t(f.h)}</b><span className="muted">{t(f.p)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="page" style={{ paddingTop: 0 }}>
        <div className="card violet-panel" style={{ padding: 'clamp(24px, 5vw, 40px)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderColor: 'transparent' }}>
          <div style={{ maxWidth: 560 }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)' }}>{t('landing.ctaTitle')}</h2>
            <p style={{ marginTop: 10, opacity: 0.9 }}>{t('landing.ctaText')}</p>
          </div>
          <Link to="/login?mode=signup" className="btn btn-lime" style={{ minHeight: 48, padding: '0 24px' }}>{t('landing.ctaBtn')} <ArrowRightOutlined /></Link>
        </div>
      </section>
    </>
  );
}

interface DashData {
  tasks: Todo[];
  openTasks: number;
  overdue: number;
  events: CalendarEvent[];
  notes: Note[];
  saved: CourseRef[];
  unread: number;
  cgpa: number | null;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'dash.late' : h < 12 ? 'dash.morning' : h < 17 ? 'dash.afternoon' : 'dash.evening';
};

export function dueLabel(deadline: string | null, t: (k: string, v?: Record<string, string | number>) => string) {
  if (!deadline) return '';
  const days = dayjs(deadline).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (days < 0) return t('time.overdue', { n: -days });
  if (days === 0) return t('time.today');
  if (days === 1) return t('time.tomorrow');
  return t('time.inDays', { n: days });
}

function Dashboard() {
  const { t, num, date } = useLang();
  const { user } = useAuth();
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    api.get('/me/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="page"><Loading rows={4} /></div>;

  const kindTag: Record<string, string> = { exam: 'coral', quiz: 'amber', assignment: 'violet', lab: 'lime', class: '', other: '' };

  return (
    <div className="page">
      <header className="card rise" style={{ padding: 'clamp(20px, 4vw, 34px)', background: 'var(--night)', borderColor: 'transparent', color: 'var(--on-night)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', border: '26px solid var(--lime)', opacity: 0.9 }} aria-hidden="true" />
        <p className="eyebrow" style={{ color: 'var(--lime)' }}>{date(new Date(), 'dddd, D MMMM')}</p>
        <h1 style={{ color: 'inherit', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginTop: 8, maxWidth: '80%' }}>{t(greeting(), { name: user!.name.split(' ')[0] })}</h1>
        <p style={{ marginTop: 6, opacity: 0.85 }}>{t('dash.sub')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, marginTop: 24 }}>
          <div className="stat">
            <b style={{ color: 'var(--lime)' }}>{data.cgpa != null ? num(data.cgpa, 2) : t('common.none')}</b>
            <span style={{ color: 'inherit', opacity: 0.8 }}>{data.cgpa != null ? t('dash.cgpa') : <Link to="/cgpa" style={{ color: 'inherit' }}>{t('dash.noCgpa')}</Link>}</span>
          </div>
          <div className="stat"><b>{num(data.openTasks)}</b><span style={{ color: 'inherit', opacity: 0.8 }}>{t('dash.open')}{data.overdue > 0 && `, ${t('dash.overdue', { n: data.overdue })}`}</span></div>
          <div className="stat"><b>{num(data.saved.length)}</b><span style={{ color: 'inherit', opacity: 0.8 }}>{t('dash.saved')}</span></div>
          <div className="stat"><b>{num(data.unread)}</b><span style={{ color: 'inherit', opacity: 0.8 }}>{t('dash.unread')}</span></div>
        </div>
      </header>

      <nav aria-label={t('dash.quick')} className="grid grid-4" style={{ marginTop: 18 }}>
        {[
          { to: '/planner', icon: <CompassOutlined />, label: 'dash.qPlan' },
          { to: '/forum?ask=1', icon: <MessageOutlined />, label: 'dash.qAsk' },
          { to: '/courses', icon: <EditOutlined />, label: 'dash.qReview' },
          { to: '/study?tab=focus', icon: <FieldTimeOutlined />, label: 'dash.qFocus' },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="card pad" style={{ display: 'flex', alignItems: 'center', fontWeight: 700, gap: 12, color: 'var(--ink)' }}>
            <span style={{ display: 'inline-grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, background: 'var(--lime-lo)', color: 'var(--lime-ink)', fontSize: 18, flexShrink: 0 }}>{q.icon}</span>
            {t(q.label)}
          </Link>
        ))}
      </nav>

      <div className="split" style={{ marginTop: 22 }}>
        <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
          <section className="card pad" aria-labelledby="due-title">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 id="due-title" style={{ fontSize: '1.3rem' }}>{t('dash.tasks')}</h2>
              <Link to="/study" className="btn btn-quiet btn-sm">{t('dash.allTasks')} <ArrowRightOutlined /></Link>
            </div>
            {data.tasks.length === 0 ? (
              <p className="muted">{t('dash.noTasks')}</p>
            ) : (
              <ul className="list-plain">
                {data.tasks.map((task) => {
                  const late = task.deadline && dayjs(task.deadline).isBefore(dayjs().startOf('day'));
                  return (
                    <li key={task._id} className="link-row">
                      <span className={`tag ${task.priority === 'high' ? 'coral' : task.priority === 'medium' ? 'amber' : ''}`}>{t(`study.${task.priority}`)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{task.text}</span>
                      {task.course && <span className="code">{task.course.code}</span>}
                      {task.deadline && <span className={`small ${late ? '' : 'muted'}`} style={{ color: late ? 'var(--coral)' : undefined, fontWeight: late ? 700 : 400 }}>{dueLabel(task.deadline, t)}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            <Link to="/study" className="btn btn-line btn-sm" style={{ marginTop: 12 }}><PlusOutlined /> {t('dash.addTask')}</Link>
          </section>

          <section className="card pad" aria-labelledby="up-title">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 id="up-title" style={{ fontSize: '1.3rem' }}>{t('dash.upcoming')}</h2>
              <Link to="/study?tab=calendar" className="btn btn-quiet btn-sm">{t('dash.calendar')} <ArrowRightOutlined /></Link>
            </div>
            {data.events.length === 0 ? <p className="muted">{t('dash.noEvents')}</p> : (
              <ul className="list-plain">
                {data.events.map((ev) => (
                  <li key={ev._id} className="link-row">
                    <span style={{ width: 54, textAlign: 'center', flexShrink: 0 }}>
                      <b style={{ display: 'block', fontFamily: 'var(--display)', fontSize: '1.4rem', lineHeight: 1 }}>{date(ev.date, 'D')}</b>
                      <span className="small muted">{date(ev.date, 'MMM')}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700 }}>{ev.title}</span>
                      <span className="small muted row" style={{ gap: 6 }}><ClockCircleOutlined /> {ev.time || t('study.allDay')}</span>
                    </span>
                    <span className={`tag ${kindTag[ev.kind]}`}>{t(`study.kinds.${ev.kind}`)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
          <section className="card pad" aria-labelledby="saved-title">
            <h2 id="saved-title" style={{ fontSize: '1.2rem', marginBottom: 8 }}>{t('dash.savedTitle')}</h2>
            {data.saved.length === 0 ? (
              <>
                <p className="muted">{t('dash.noSaved')}</p>
                <Link to="/courses" className="btn btn-line btn-sm" style={{ marginTop: 10 }}><BookOutlined /> {t('dash.findCourses')}</Link>
              </>
            ) : (
              <ul className="list-plain">
                {data.saved.map((c) => (
                  <li key={c._id}>
                    <Link to={`/courses/${c.code}`} className="link-row">
                      <span className="code">{c.code}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{c.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card pad" aria-labelledby="notes-title">
            <h2 id="notes-title" style={{ fontSize: '1.2rem', marginBottom: 8 }}>{t('dash.notes')}</h2>
            {data.notes.length === 0 ? <p className="muted">{t('dash.noNotes')}</p> : (
              <ul className="list-plain">
                {data.notes.map((n) => (
                  <li key={n._id}>
                    <Link to={`/study?tab=notes&note=${n._id}`} className="link-row">
                      <FileTextOutlined style={{ color: 'var(--violet)' }} />
                      <span style={{ flex: 1, minWidth: 0 }}>{n.title}</span>
                      {n.course && <span className="code">{n.course.code}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function Home() {
  const { token, user } = useAuth();
  return token && user ? <Dashboard /> : <Landing />;
}
