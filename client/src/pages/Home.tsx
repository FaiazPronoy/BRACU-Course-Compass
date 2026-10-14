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
import { Avatar, CodeChip, Loading, Stars } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { CalendarEvent, CourseRef, Note, Review, Todo } from '../lib/types';
import { useAuth } from '../redux/store';

/* ------------------------------------------------------------------ visitors */

function CompassArt() {
  // a compass rose drawn in the site colours; the needle points north-east,
  // towards the headline
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
      {/* course codes floating around the dial */}
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
        <Avatar name={r.author?.name} size={28} />
        <span>{r.author?.name}</span>
        <span>· {ago(r.createdAt)}</span>
        <span className="tag" style={{ marginLeft: 'auto' }}>{r.faculty}</span>
      </div>
      <span className="sr-only">{t('review.took', { semester: r.semester, faculty: r.faculty })}</span>
    </article>
  );
}

function Landing() {
  const { t, num } = useLang();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [recent, setRecent] = useState<Review[] | null>(null);

  useEffect(() => {
    api.get('/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/reviews/recent?limit=6').then((r) => setRecent(r.data)).catch(() => setRecent([]));
  }, []);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const code = q.trim().toUpperCase().replace(/\s+/g, '');
    navigate(/^[A-Z]{3}\d{3}$/.test(code) ? `/courses/${code}` : `/courses?search=${encodeURIComponent(q.trim())}`);
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
      <section className="page" style={{ paddingTop: 40 }}>
        <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', alignItems: 'center' }}>
          <div className="rise">
            <p className="eyebrow"><CompassOutlined /> {t('landing.kicker')}</p>
            <h1 style={{ fontSize: 'clamp(2.5rem, 6.5vw, 4.4rem)', marginTop: 14, textWrap: 'balance' } as React.CSSProperties}>
              <span style={{ display: 'block' }}>{t('landing.title1')}</span>
              <span style={{ display: 'inline', background: 'linear-gradient(transparent 58%, var(--marker) 58%, var(--marker) 90%, transparent 90%)' }}>
                {t('landing.title2')}
              </span>
            </h1>
            <p className="muted lead" style={{ fontSize: '1.15rem', marginTop: 18, maxWidth: '54ch' }}>{t('landing.lead')}</p>

            <form onSubmit={search} role="search" style={{ marginTop: 26, display: 'flex', gap: 8, maxWidth: 520 }}>
              <label htmlFor="hero-search" className="sr-only">{t('landing.searchLabel')}</label>
              <div style={{ position: 'relative', flex: 1 }}>
                <SearchOutlined style={{ position: 'absolute', left: 15, top: 16, color: 'var(--ink-2)' }} />
                <input id="hero-search" className="field" style={{ paddingLeft: 42, minHeight: 52 }} placeholder={t('landing.searchPh')}
                  value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ minHeight: 52 }}>{t('landing.go')}</button>
            </form>
            <div className="row" style={{ marginTop: 14 }}>
              <Link to="/courses" className="btn btn-quiet btn-sm" style={{ marginLeft: -12 }}>{t('landing.browse')} <ArrowRightOutlined /></Link>
            </div>
          </div>
          <div className="center rise" style={{ animationDelay: '.1s' }}>
            <CompassArt />
          </div>
        </div>
      </section>

      {stats && (
        <section aria-label={t('landing.statsLabel')} style={{ background: 'var(--night)', color: 'var(--on-night)' }}>
          <div className="page" style={{ paddingTop: 28, paddingBottom: 28, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', margin: '0 auto', textAlign: 'center' }}>
            {[['courses', 'statCourses'], ['reviews', 'statReviews'], ['threads', 'statThreads'], ['students', 'statStudents']].map(([k, label]) => (
              <div key={k}>
                <b style={{ display: 'block', fontFamily: 'var(--display)', fontWeight: 800, fontSize: '2.4rem', color: 'var(--lime)' }}>{num(stats[k])}</b>
                <span style={{ opacity: 0.85 }}>{t(`landing.${label}`)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="page">
        <div className="center" style={{ maxWidth: 680, margin: '20px auto 34px' }}>
          <p className="eyebrow">{t('landing.featEyebrow')}</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginTop: 8, textWrap: 'balance' } as React.CSSProperties}>{t('landing.featTitle')}</h2>
        </div>
        <div className="grid grid-3">
          {features.map((f) => (
            <Link key={f.h} to={f.to} className="card pad feature-card">
              <span className="feature-icon" aria-hidden="true">{f.icon}</span>
              <h3 style={{ marginTop: 14, fontSize: '1.25rem' }}>{t(f.h)}</h3>
              <p className="justify" style={{ marginTop: 6, color: 'var(--ink-2)' }}>{t(f.p)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="page" style={{ paddingTop: 0 }}>
        <div className="page-head with-action">
          <div>
            <p className="eyebrow">{t('landing.recentEyebrow')}</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.3rem)', marginTop: 8 }}>{t('landing.recentTitle')}</h2>
          </div>
          <Link to="/courses" className="btn btn-line">{t('landing.recentAll')} <ArrowRightOutlined /></Link>
        </div>
        {recent === null ? <Loading rows={2} height={160} /> : (
          <div className="grid grid-3">{recent.map((r) => <ReviewSnippet key={r._id} r={r} />)}</div>
        )}
      </section>

      <section className="page" style={{ paddingTop: 0 }}>
        <div className="card violet-panel" style={{ padding: 'clamp(24px, 5vw, 48px)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderColor: 'transparent' }}>
          <div style={{ maxWidth: 560 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)', textWrap: 'balance' } as React.CSSProperties}>{t('landing.ctaTitle')}</h2>
            <p style={{ marginTop: 10, opacity: 0.9 }}>{t('landing.ctaText')}</p>
          </div>
          <Link to="/login?mode=signup" className="btn btn-lime" style={{ minHeight: 52, padding: '0 26px' }}>{t('landing.ctaBtn')} <ArrowRightOutlined /></Link>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- students */

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
