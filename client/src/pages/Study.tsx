import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  LeftOutlined,
  OrderedListOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { DatePicker, Modal, Select } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Confirm, Empty, Loading, PageHead } from '../components/bits';
import NoteEditor from '../components/NoteEditor';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { CalendarEvent, CourseRef, EventKind, Note, Todo } from '../lib/types';
import { dueLabel } from './Home';

type Tab = 'tasks' | 'calendar' | 'notes' | 'focus';

function useCourses() {
  const [courses, setCourses] = useState<CourseRef[]>([]);
  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data)).catch(() => {});
  }, []);
  return courses.map((c) => ({ value: c.code, label: `${c.code} · ${c.title}` }));
}

/* -------------------------------------------------------------------- tasks */

function Tasks() {
  const { t, errorText } = useLang();
  const courseOptions = useCourses();
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'soon' | 'late' | 'done'>('all');
  const [draft, setDraft] = useState<{ text: string; priority: string; deadline: Dayjs | null; course: string | undefined }>({
    text: '', priority: 'medium', deadline: null, course: undefined,
  });

  const load = useCallback(() => {
    api.get('/todos').then((r) => setTodos(r.data)).catch(() => setTodos([]));
  }, []);
  useEffect(load, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/todos', { ...draft, deadline: draft.deadline?.format('YYYY-MM-DD') || null, course: draft.course || null });
      setDraft({ text: '', priority: 'medium', deadline: null, course: draft.course });
      toast.success(t('study.taskAdded'));
      load();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const toggle = async (task: Todo) => {
    setTodos((list) => list!.map((x) => (x._id === task._id ? { ...x, completed: !x.completed } : x)));
    await api.put(`/todos/${task._id}`, { completed: !task.completed }).catch(load);
  };

  const today = dayjs().startOf('day');
  const shown = (todos || []).filter((x) => {
    if (filter === 'done') return x.completed;
    if (x.completed) return false;
    if (filter === 'late') return x.deadline && dayjs(x.deadline).isBefore(today);
    if (filter === 'soon') return x.deadline && dayjs(x.deadline).diff(today, 'day') <= 7;
    return true;
  });

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <form onSubmit={add} className="card pad" style={{ display: 'grid', gap: 12 }}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <label htmlFor="task-text" className="sr-only">{t('study.taskPh')}</label>
          <input id="task-text" className="field" value={draft.text} maxLength={200} placeholder={t('study.taskPh')} required
            onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          <button className="btn btn-primary"><PlusOutlined /> {t('study.add')}</button>
        </div>
        <div className="form-grid">
          <div>
            <label htmlFor="task-pri" className="label small">{t('study.priority')}</label>
            <select id="task-pri" className="field" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
              {['high', 'medium', 'low'].map((p) => <option key={p} value={p}>{t(`study.${p}`)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task-due" className="label small">{t('study.deadline')}</label>
            <DatePicker id="task-due" value={draft.deadline} onChange={(d) => setDraft({ ...draft, deadline: d })} format="D MMM YYYY" />
          </div>
          <div>
            <label htmlFor="task-course" className="label small">{t('study.course')}</label>
            <Select id="task-course" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder={t('study.noCourse')}
              value={draft.course} onChange={(v) => setDraft({ ...draft, course: v })} options={courseOptions} />
          </div>
        </div>
      </form>

      <div className="chips" role="group" aria-label={t('study.tabTasks')}>
        {(['all', 'soon', 'late', 'done'] as const).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {t({ all: 'study.filterAll', soon: 'study.filterToday', late: 'study.filterLate', done: 'study.filterDone' }[f])}
          </button>
        ))}
      </div>

      {todos === null ? <Loading rows={3} height={56} /> : shown.length === 0 ? (
        <Empty title={t('study.noTasks')} text={t('study.noTasksText')} icon={<OrderedListOutlined />} />
      ) : (
        <ul className="card list-plain" style={{ padding: '4px 14px' }}>
          {shown.map((task) => {
            const late = !task.completed && task.deadline && dayjs(task.deadline).isBefore(today);
            return (
              <li key={task._id} className="link-row" style={{ gap: 12 }}>
                <button type="button" onClick={() => toggle(task)} aria-pressed={task.completed} aria-label={`${task.completed ? t('study.undo') : t('study.done')}: ${task.text}`}
                  style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 9, border: `2px solid ${task.completed ? 'var(--violet)' : 'var(--line-2)'}`,
                    background: task.completed ? 'var(--violet)' : 'transparent', color: 'var(--on-violet)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  {task.completed && <CheckOutlined />}
                </button>
                <span style={{ flex: 1, minWidth: 0, textDecoration: task.completed ? 'line-through' : undefined, color: task.completed ? 'var(--ink-2)' : undefined }}>
                  {task.text}
                </span>
                {task.course && <Link to={`/courses/${task.course.code}`} className="code">{task.course.code}</Link>}
                <span className={`tag ${task.priority === 'high' ? 'coral' : task.priority === 'medium' ? 'amber' : ''}`}>{t(`study.${task.priority}`)}</span>
                {task.deadline && (
                  <span className="small" style={{ color: late ? 'var(--coral)' : 'var(--ink-2)', fontWeight: late ? 700 : 400, minWidth: 74, textAlign: 'right' }}>
                    {dueLabel(task.deadline, t)}
                  </span>
                )}
                <Confirm title={t('common.sure')} onConfirm={() => api.delete(`/todos/${task._id}`).then(() => { toast.success(t('study.taskDeleted')); load(); })}>
                  <button type="button" className="icon-btn" aria-label={`${t('common.delete')}: ${task.text}`}><DeleteOutlined /></button>
                </Confirm>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- calendar */

const KINDS: EventKind[] = ['class', 'quiz', 'exam', 'assignment', 'lab', 'other'];
const kindColour: Record<EventKind, string> = { exam: 'var(--coral)', quiz: 'var(--amber)', assignment: 'var(--violet)', lab: 'var(--lime-ink)', class: 'var(--ink-2)', other: 'var(--ink-2)' };

function Calendar() {
  const { t, date, errorText } = useLang();
  const courseOptions = useCourses();
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [picked, setPicked] = useState(dayjs().startOf('day'));
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ title: string; time: string; kind: EventKind; course: string | undefined }>({ title: '', time: '', kind: 'quiz', course: undefined });

  const load = useCallback(() => {
    api.get('/events').then((r) => setEvents(r.data)).catch(() => setEvents([]));
    api.get('/todos').then((r) => setTodos(r.data.filter((x: Todo) => x.deadline && !x.completed))).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, { events: CalendarEvent[]; tasks: Todo[] }>();
    const get = (k: string) => map.get(k) || map.set(k, { events: [], tasks: [] }).get(k)!;
    (events || []).forEach((e) => get(dayjs(e.date).format('YYYY-MM-DD')).events.push(e));
    todos.forEach((x) => get(dayjs(x.deadline!).format('YYYY-MM-DD')).tasks.push(x));
    return map;
  }, [events, todos]);

  // six rows of seven, starting on the Sunday before the 1st
  const cells = Array.from({ length: 42 }, (_, i) => month.startOf('month').startOf('week').add(i, 'day'));
  const weekdays = cells.slice(0, 7).map((d) => date(d.toDate(), 'dd'));
  const day = byDay.get(picked.format('YYYY-MM-DD'));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/events', { ...draft, date: picked.format('YYYY-MM-DD'), course: draft.course || null });
      toast.success(t('study.eventAdded'));
      setOpen(false);
      setDraft({ title: '', time: '', kind: 'quiz', course: undefined });
      load();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  if (events === null) return <Loading rows={2} height={200} />;

  return (
    <div className="split">
      <section className="card pad">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: '1.3rem' }} aria-live="polite">{date(month.toDate(), 'MMMM YYYY')}</h2>
          <div className="row" style={{ gap: 4 }}>
            <button type="button" className="icon-btn" aria-label={t('study.prev')} onClick={() => setMonth(month.subtract(1, 'month'))}><LeftOutlined /></button>
            <button type="button" className="btn btn-line btn-sm" onClick={() => { setMonth(dayjs().startOf('month')); setPicked(dayjs().startOf('day')); }}>{t('study.today')}</button>
            <button type="button" className="icon-btn" aria-label={t('study.next')} onClick={() => setMonth(month.add(1, 'month'))}><RightOutlined /></button>
          </div>
        </div>
        <div role="grid" aria-label={date(month.toDate(), 'MMMM YYYY')} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
          {weekdays.map((w, i) => <div key={i} role="columnheader" className="small muted center" style={{ fontWeight: 700, padding: '4px 0' }}>{w}</div>)}
          {cells.map((d) => {
            const key = d.format('YYYY-MM-DD');
            const items = byDay.get(key);
            const inMonth = d.month() === month.month();
            const isToday = d.isSame(dayjs(), 'day');
            const isPicked = d.isSame(picked, 'day');
            return (
              <button key={key} type="button" role="gridcell" aria-selected={isPicked} onClick={() => setPicked(d)}
                aria-label={`${date(d.toDate(), 'D MMMM')}${items ? `, ${items.events.length + items.tasks.length}` : ''}`}
                style={{ minHeight: 64, padding: 6, borderRadius: 10, font: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4,
                  border: `1.5px solid ${isPicked ? 'var(--violet)' : 'var(--line)'}`, background: isPicked ? 'var(--violet-lo)' : inMonth ? 'var(--surface)' : 'var(--sunken)',
                  color: inMonth ? 'var(--ink)' : 'var(--ink-2)' }}>
                <span style={{ fontWeight: 700, fontSize: 13, width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 8,
                  background: isToday ? 'var(--lime)' : undefined, color: isToday ? '#17122e' : undefined }}>{d.date()}</span>
                <span style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }} aria-hidden="true">
                  {items?.events.slice(0, 3).map((e) => <i key={e._id} style={{ width: 8, height: 8, borderRadius: 4, background: kindColour[e.kind] }} />)}
                  {items?.tasks.slice(0, 3).map((x) => <i key={x._id} style={{ width: 8, height: 8, borderRadius: 2, border: '2px solid var(--violet)' }} />)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="card pad">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.15rem' }}>{t('study.onDay', { date: date(picked.toDate(), 'D MMMM') })}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><PlusOutlined /> {t('study.newEvent')}</button>
        </div>
        {!day || (day.events.length === 0 && day.tasks.length === 0) ? <p className="muted" style={{ marginTop: 12 }}>{t('study.freeDay')}</p> : (
          <ul className="list-plain" style={{ marginTop: 8 }}>
            {day.events.map((e) => (
              <li key={e._id} className="link-row" style={{ alignItems: 'flex-start' }}>
                <i style={{ width: 10, height: 10, borderRadius: 5, background: kindColour[e.kind], marginTop: 8, flexShrink: 0 }} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block' }}>{e.title}</b>
                  <span className="small muted row" style={{ gap: 6 }}>
                    <ClockCircleOutlined /> {e.time || t('study.allDay')} · {t(`study.kinds.${e.kind}`)} {e.course && <span className="code">{e.course.code}</span>}
                  </span>
                </span>
                <Confirm title={t('common.sure')} onConfirm={() => api.delete(`/events/${e._id}`).then(() => { toast.success(t('study.eventDeleted')); load(); })}>
                  <button type="button" className="icon-btn" aria-label={`${t('common.delete')}: ${e.title}`}><DeleteOutlined /></button>
                </Confirm>
              </li>
            ))}
            {day.tasks.map((x) => (
              <li key={x._id} className="link-row">
                <i style={{ width: 10, height: 10, borderRadius: 3, border: '2px solid var(--violet)', flexShrink: 0 }} aria-hidden="true" />
                <span style={{ flex: 1 }}>{t('study.dueTask', { task: x.text })}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <Modal open={open} onCancel={() => setOpen(false)} footer={null} title={`${t('study.newEvent')}: ${date(picked.toDate(), 'D MMMM YYYY')}`} destroyOnHidden>
        <form onSubmit={add} className="stack" style={{ marginTop: 12 }}>
          <div>
            <label htmlFor="ev-title" className="label">{t('study.eventTitle')}</label>
            <input id="ev-title" className="field" required maxLength={120} placeholder={t('study.eventTitlePh')} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="form-grid">
            <div>
              <label htmlFor="ev-kind" className="label">{t('study.kind')}</label>
              <select id="ev-kind" className="field" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as EventKind })}>
                {KINDS.map((k) => <option key={k} value={k}>{t(`study.kinds.${k}`)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ev-time" className="label">{t('study.time')}</label>
              <input id="ev-time" type="time" className="field" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="ev-course" className="label">{t('study.course')}</label>
            <Select id="ev-course" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder={t('study.noCourse')}
              value={draft.course} onChange={(v) => setDraft({ ...draft, course: v })} options={courseOptions} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn btn-primary">{t('study.add')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------- notes */

function Notes() {
  const { t, date, errorText } = useLang();
  const [params, setParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const openId = params.get('note');

  const load = useCallback(() => {
    api.get('/notes').then((r) => setNotes(r.data)).catch(() => setNotes([]));
  }, []);
  useEffect(load, [load]);

  const create = useCallback(async (course?: string | null) => {
    try {
      const { data } = await api.post('/notes', { title: t('notes.untitled'), content: '', course: course || null });
      setNotes((list) => [data, ...(list || [])]);
      setParams({ tab: 'notes', note: data._id }, { replace: true });
    } catch (err) {
      toast.error(errorText(err));
    }
  }, [t, errorText, setParams]);

  // "New note" on a course page lands here with ?new=1&course=CSE221
  const creating = useRef(false);
  useEffect(() => {
    if (params.get('new') === '1' && !creating.current) {
      creating.current = true;
      create(params.get('course'));
    }
  }, [params, create]);

  if (notes === null) return <Loading rows={2} height={120} />;
  const current = notes.find((n) => n._id === openId);

  return (
    <div className="split split-notes">
      <aside className="card pad">
        <button type="button" className="btn btn-primary btn-block" onClick={() => create()}><PlusOutlined /> {t('notes.new')}</button>
        {notes.length === 0 ? <p className="muted small" style={{ marginTop: 12 }}>{t('notes.noNotesText')}</p> : (
          <ul className="list-plain" style={{ marginTop: 10 }}>
            {notes.map((n) => (
              <li key={n._id}>
                <button type="button" className="link-row" onClick={() => setParams({ tab: 'notes', note: n._id }, { replace: true })}
                  aria-current={n._id === openId ? 'true' : undefined}
                  style={{ width: '100%', border: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left',
                    background: n._id === openId ? 'var(--violet-lo)' : 'transparent' }}>
                  <FileTextOutlined style={{ color: 'var(--violet)' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                    <span className="small muted">{n.course ? `${n.course.code} · ` : ''}{date(n.updatedAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="card pad">
        {current ? (
          <>
            {current.playlist && current.course && (
              <p className="small" style={{ marginBottom: 10 }}>
                <Link to={`/watch?course=${current.course.code}&list=${new URL(current.playlist).searchParams.get('list')}`} className="btn btn-line btn-sm">
                  <PlayCircleOutlined /> {t('notes.openVideo')}
                </Link>
              </p>
            )}
            <NoteEditor note={current}
              onSaved={(n) => setNotes((list) => list!.map((x) => (x._id === n._id ? { ...x, title: n.title, updatedAt: n.updatedAt } : x)))}
              onDeleted={() => { setParams({ tab: 'notes' }, { replace: true }); load(); }} />
          </>
        ) : (
          <Empty title={notes.length ? t('notes.pick') : t('notes.noNotes')} text={notes.length ? undefined : t('notes.noNotesText')} icon={<FileTextOutlined />} />
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------- focus */

const LENGTHS = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };

function Focus() {
  const { t } = useLang();
  const [mode, setMode] = useState<keyof typeof LENGTHS>('work');
  const [left, setLeft] = useState(LENGTHS.work);
  const [running, setRunning] = useState(false);
  const todayKey = `focus-${dayjs().format('YYYY-MM-DD')}`;
  const [rounds, setRounds] = useState(() => {
    try {
      return Number(localStorage.getItem(todayKey) || 0);
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (left > 0) return;
    setRunning(false);
    if (mode === 'work') {
      const next = rounds + 1;
      setRounds(next);
      try { localStorage.setItem(todayKey, String(next)); } catch { /* private mode */ }
      toast.success(t('study.breakTime'));
      const brk = next % 4 === 0 ? 'long' : 'short';
      setMode(brk);
      setLeft(LENGTHS[brk]);
    } else {
      toast(t('study.backToWork'));
      setMode('work');
      setLeft(LENGTHS.work);
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  // the tab title shows the time left, so it is visible from another tab
  useEffect(() => {
    const base = document.title;
    if (running) document.title = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} · ${t('study.focusTitle')}`;
    return () => { document.title = base; };
  }, [running, left, t]);

  const pick = (m: keyof typeof LENGTHS) => {
    setMode(m);
    setLeft(LENGTHS[m]);
    setRunning(false);
  };

  const total = LENGTHS[mode];
  const pct = 1 - left / total;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <section className="card pad center" style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(22px, 5vw, 40px)' }}>
      <h2 style={{ fontSize: '1.4rem' }}>{t('study.focusTitle')}</h2>
      <p className="muted" style={{ marginTop: 6 }}>{t('study.focusLead')}</p>
      <div className="chips" role="group" style={{ justifyContent: 'center', marginTop: 18 }}>
        {(['work', 'short', 'long'] as const).map((m) => (
          <button key={m} type="button" className="chip" aria-pressed={mode === m} onClick={() => pick(m)}>
            {t({ work: 'study.work', short: 'study.shortBreak', long: 'study.longBreak' }[m])}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', width: 240, height: 240, margin: '26px auto' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--sunken)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={mode === 'work' ? 'var(--violet)' : 'var(--lime)'} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44} strokeDashoffset={2 * Math.PI * 44 * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div role="timer" aria-live="off" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '3rem' }}>
          {mm}:{ss}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={() => setRunning((r) => !r)} style={{ minWidth: 130 }}>
          {running ? <><PauseOutlined /> {t('study.pause')}</> : <><PlayCircleOutlined /> {t('study.start')}</>}
        </button>
        <button type="button" className="btn btn-line" onClick={() => pick(mode)}><ReloadOutlined /> {t('study.reset')}</button>
      </div>
      <p className="muted" style={{ marginTop: 18 }}>{t('study.rounds', { n: rounds })} {rounds > 0 && <span aria-hidden>{'🔥'.repeat(Math.min(rounds, 8))}</span>}</p>
    </section>
  );
}

export default function Study() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'tasks';

  const tabs: [Tab, string, React.ReactNode][] = [
    ['tasks', t('study.tabTasks'), <OrderedListOutlined key="t" />],
    ['calendar', t('study.tabCalendar'), <CalendarOutlined key="c" />],
    ['notes', t('study.tabNotes'), <FileTextOutlined key="n" />],
    ['focus', t('study.tabFocus'), <FieldTimeOutlined key="f" />],
  ];

  return (
    <div className="page">
      <PageHead eyebrow={t('study.eyebrow')} title={t('study.title')} lead={t('study.lead')} />
      <div className="tabs" role="tablist" style={{ marginBottom: 22 }}>
        {tabs.map(([key, label, icon]) => (
          <button key={key} type="button" role="tab" className="tab" aria-selected={tab === key} onClick={() => setParams(key === 'tasks' ? {} : { tab: key }, { replace: true })}>
            {icon} {label}
          </button>
        ))}
      </div>
      {tab === 'tasks' && <Tasks />}
      {tab === 'calendar' && <Calendar />}
      {tab === 'notes' && <Notes />}
      {tab === 'focus' && <Focus />}
    </div>
  );
}
