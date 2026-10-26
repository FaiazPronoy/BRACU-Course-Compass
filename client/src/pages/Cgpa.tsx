import {
  CheckCircleFilled, CloseOutlined, DeleteOutlined, EditOutlined, FilePdfOutlined, LockOutlined, PlusOutlined, PrinterOutlined, UndoOutlined, UploadOutlined, WarningFilled,
} from '@ant-design/icons';
import { Modal } from 'antd';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import CgpaByHand from '../components/CgpaByHand';
import CgpaChart from '../components/CgpaChart';
import LiveCgpa from '../components/LiveCgpa';
import { Confirm, Empty, Loading, PageHead } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import { Candidate, candidates, cgpaWithGains, gainFor, scenarios } from '../lib/engine/boost';
import {
  add, ALL_GRADES, Attempt, GRADE_POINTS, Grade, honourOf, LETTER_GRADES, LetterGrade, levelOf, MARKS, nextSemester, projectedCgpa, projectedSplit,
  semesterIndex, semesterName, semesterSums, gpaOf, standingOf, Sums, timeline, TermRow, totals,
} from '../lib/engine/grades';
import { checkSheet, FIGURES, ParsedSheet, readGradeSheet } from '../lib/engine/gradesheet';
import { detectProgram, programByCode, PROGRAMS } from '../lib/engine/programs';
import { gradeCounts, planTarget } from '../lib/engine/targets';
import { recentSemesters } from '../lib/grades';
import { sampleTranscript } from '../lib/sample';
import type { CourseRef, GradeRecord } from '../lib/types';
import { useTranscript } from '../lib/useTranscript';
import { useAuth } from '../redux/store';

type Tab = 'overview' | 'transcript' | 'whatif' | 'repeat' | 'target' | 'rules';
const TABS: Tab[] = ['overview', 'transcript', 'whatif', 'repeat', 'target', 'rules'];
const HOPES: LetterGrade[] = ['A', 'A-', 'B+', 'B'];

const gp = (g: string) => GRADE_POINTS[g as LetterGrade] ?? 0;
const diff = (a: number, b: number) => Math.round((a - b) * 100) / 100;
const keyOf = (r: GradeRecord) => r._id || `${r.code}|${r.semester}`;
const plainRecord = (r: GradeRecord): GradeRecord => ({ code: r.code, title: r.title, credits: r.credits, grade: r.grade, semester: r.semester });
const sameList = (a: GradeRecord[], b: GradeRecord[]) => {
  const line = (r: GradeRecord) => [r.code, r.semester, r.grade, r.credits, r.title].join('|');
  return JSON.stringify(a.map(line).sort()) === JSON.stringify(b.map(line).sort());
};
const toAttempts = (records: GradeRecord[]): Attempt[] =>
  records.map((r) => ({ id: keyOf(r), code: r.code, title: r.title, credits: r.credits, grade: r.grade as Grade, semester: r.semester }));

function useProgram() {
  const { user } = useAuth();
  const fromDept = user?.department === 'LAW' ? 'LLB' : user?.department;
  const [code, setCode] = useState<string | null>(() => {
    try {
      return localStorage.getItem('cc-program') || programByCode(fromDept)?.code || null;
    } catch {
      return programByCode(fromDept)?.code || null;
    }
  });
  const [credits, setCredits] = useState<number | null>(() => {
    try {
      const n = Number(localStorage.getItem('cc-program-credits'));
      return n > 0 ? n : null;
    } catch {
      return null;
    }
  });
  const save = (c: string | null, n: number | null) => {
    setCode(c);
    setCredits(n);
    try {
      if (c) localStorage.setItem('cc-program', c);
      else localStorage.removeItem('cc-program');
      if (n) localStorage.setItem('cc-program-credits', String(n));
      else localStorage.removeItem('cc-program-credits');
    } catch {
    }
  };
  const program = programByCode(code);
  return { program, needed: credits ?? program?.credits ?? null, setProgram: (c: string | null) => save(c, null), setNeeded: (n: number | null) => save(code, n) };
}

function Summary({ attempts, rows, after, probation }: { attempts: Attempt[]; rows: TermRow[]; after?: number | null; probation?: number }) {
  const { t, num } = useLang();
  const s = totals(attempts);
  const standing = standingOf(rows, probation);
  const change = after != null && s.cgpa != null ? diff(after, s.cgpa) : null;
  return (
    <div className="card summary-strip">
      <div className="stat">
        <b style={{ color: 'var(--violet)' }}>{s.cgpa != null ? num(s.cgpa, 2) : t('cgpa.none')}</b>
        <span>{t('cgpa.cgpa')}</span>
      </div>
      {after != null && (
        <div className="stat">
          <b>{num(after, 2)}</b>
          <span>
            {t('cgpa.withChanges')}{' '}
            {change != null && change !== 0 && <span className={`tag ${change > 0 ? 'lime' : 'coral'}`}>{change > 0 ? '+' : ''}{num(change, 2)}</span>}
          </span>
        </div>
      )}
      <div className="stat"><b>{num(s.earned)}</b><span>{t('cgpa.earned')}</span></div>
      <div className="stat"><b>{num(s.attempted)}</b><span>{t('cgpa.attempted')}</span></div>
      <div className="stat">
        <b style={{ fontSize: '1.15rem', marginTop: 8 }}>
          {standing ? <span className={`tag ${standing.status === 'good' ? 'lime' : 'coral'}`}>{t(`cgpa.standing_${standing.status}`)}</span> : t('cgpa.none')}
        </b>
        <span>{t('cgpa.standing')}</span>
      </div>
    </div>
  );
}

function SidePanel({ attempts, rows, program }: { attempts: Attempt[]; rows: TermRow[]; program: ReturnType<typeof useProgram> }) {
  const { t, num } = useLang();
  const s = totals(attempts);
  const vc = rows.filter((r) => r.list === 'vc');
  const dean = rows.filter((r) => r.list === 'dean');
  const order = [...LETTER_GRADES, 'P', 'I', 'W'] as string[];
  const counts = [...gradeCounts([...s.counted.values()].map((a) => a.grade))].sort((x, y) => order.indexOf(x[0]) - order.indexOf(y[0]));
  const left = program.needed ? Math.max(0, program.needed - s.earned) : null;
  return (
    <aside className="stack cgpa-side" style={{ '--gap': '14px' } as React.CSSProperties} aria-label={t('cgpa.sideLabel')}>
      <section className="card pad" aria-labelledby="side-lists">
        <h2 id="side-lists" style={{ fontSize: '1.02rem' }}>{t('cgpa.lists')}</h2>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <div className="list-count"><b>{num(vc.length)}</b><span>{t('cgpa.vc')}</span></div>
          <div className="list-count dean"><b>{num(dean.length)}</b><span>{t('cgpa.dean')}</span></div>
        </div>
        {vc.length + dean.length > 0 && (
          <ul className="list-plain small" style={{ marginTop: 8 }}>
            {rows.filter((r) => r.list).map((r) => (
              <li key={r.semester} className="row" style={{ justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed var(--line)' }}>
                <span>{r.semester}</span>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)' }}>{num(r.gpa!, 2)}</span>
                  <span className={`tag ${r.list === 'vc' ? 'violet' : 'lime'}`}>{r.list === 'vc' ? t('cgpa.vcShort') : t('cgpa.deanShort')}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="hint" style={{ marginTop: 8 }}>{t('cgpa.listRule')}</p>
      </section>
      <section className="card pad" aria-labelledby="side-grades">
        <h2 id="side-grades" style={{ fontSize: '1.02rem' }}>{t('cgpa.gradeCount')}</h2>
        <ul className="grade-counts">
          {counts.map(([g, n]) => <li key={g}><span style={{ fontFamily: 'var(--mono)' }}>{g}</span><b>{num(n)}</b></li>)}
        </ul>
      </section>
      <section className="card pad" aria-labelledby="side-program">
        <h2 id="side-program" style={{ fontSize: '1.02rem' }}>{t('cgpa.program')}</h2>
        <label className="sr-only" htmlFor="cg-program">{t('cgpa.program')}</label>
        <select id="cg-program" className="field" style={{ marginTop: 8 }} value={program.program?.code ?? ''} onChange={(e) => program.setProgram(e.target.value || null)}>
          <option value="">{t('cgpa.pickProgram')}</option>
          {PROGRAMS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
        <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
          <label htmlFor="cg-needed" className="small" style={{ fontWeight: 700, flex: 1 }}>{t('cgpa.needed')}</label>
          <input id="cg-needed" className="field" type="number" min={1} max={250} style={{ width: 90, fontFamily: 'var(--mono)' }} value={program.needed ?? ''} placeholder="136"
            onChange={(e) => program.setNeeded(e.target.value ? Math.max(1, Number(e.target.value)) : null)} />
        </div>
        {left !== null && <p className="small muted" style={{ marginTop: 6 }}>{left > 0 ? t('cgpa.leftToGo', { earned: s.earned, left }) : t('cgpa.allDone')}</p>}
      </section>
      <Outlook sums={s.sums} exact={s.exact} left={left} cgpa={s.cgpa} />
    </aside>
  );
}

function Outlook({ sums, exact, left, cgpa }: { sums: Sums; exact: number | null; left: number | null; cgpa: number | null }) {
  const { t, num } = useLang();
  const [custom, setCustom] = useState<LetterGrade>('B+');
  if (exact === null || cgpa === null) return null;
  const rows: { key: string; label: React.ReactNode; value: number | null }[] = left && left > 0 ? [
    { key: 'all4', label: t('cgpa.out_all4'), value: projectedCgpa(sums, left, 4) },
    { key: 'half', label: t('cgpa.out_half'), value: projectedSplit(sums, left, 4, 3.7) },
    { key: 'all37', label: t('cgpa.out_all37'), value: projectedCgpa(sums, left, 3.7) },
    { key: 'same', label: t('cgpa.out_same'), value: projectedCgpa(sums, left, exact) },
    {
      key: 'custom',
      label: (
        <label className="row" style={{ gap: 6 }}>
          {t('cgpa.out_allAt')}
          <select className="field" style={{ width: 'auto', minHeight: 30, padding: '2px 24px 2px 8px', fontFamily: 'var(--mono)' }} value={custom} onChange={(e) => setCustom(e.target.value as LetterGrade)}>
            {LETTER_GRADES.filter((g) => g !== 'F').map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
      ),
      value: projectedCgpa(sums, left, GRADE_POINTS[custom]),
    },
  ] : [];
  return (
    <section className="card pad" aria-labelledby="side-outlook">
      <h2 id="side-outlook" style={{ fontSize: '1.02rem' }}>{t('cgpa.outlook')}</h2>
      {left === null ? <p className="small muted" style={{ marginTop: 6 }}>{t('cgpa.outlookNeeds')}</p> : left <= 0 ? (
        <p className="small muted" style={{ marginTop: 6 }}>{t('cgpa.outlookDone', { cgpa: num(cgpa, 2) })}</p>
      ) : (
        <>
          <p className="small muted" style={{ marginTop: 4 }}>{t('cgpa.outlookText', { left })}</p>
          <ul className="list-plain" style={{ marginTop: 6 }}>
            {rows.map((r) => {
              const band = honourOf(r.value);
              return (
                <li key={r.key} className="outlook-row">
                  <span className="small">{r.label}</span>
                  <b>{r.value !== null ? num(r.value, 2) : t('cgpa.none')}</b>
                  {band && <em>{t(`cgpa.honour_${band}`)}</em>}
                </li>
              );
            })}
          </ul>
          <p className="hint">{t('cgpa.outlookNote')}</p>
        </>
      )}
    </section>
  );
}

function Upload({ onRead }: { onRead: (sheet: ParsedSheet, file: string) => void }) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const read = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return void toast.error(t('cgpa.notPdf'));
    setBusy(true);
    try {
      const sheet = await readGradeSheet(file);
      if (!sheet.attempts.length) toast.error(t('cgpa.nothingFound'));
      else onRead(sheet, file.name);
    } catch {
      toast.error(t('cgpa.cannotRead'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className={`dropzone${over ? ' over' : ''}`}
      onDragOver={(e: DragEvent) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e: DragEvent) => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]); }}>
      <FilePdfOutlined style={{ fontSize: 30, color: 'var(--violet)' }} aria-hidden />
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontWeight: 700 }}>{t('cgpa.uploadTitle')}</p>
        <p className="small muted">{t('cgpa.uploadText')}</p>
        <p className="small muted row" style={{ gap: 6, marginTop: 4 }}><LockOutlined aria-hidden /> {t('cgpa.private')}</p>
      </div>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden tabIndex={-1} onChange={(e: ChangeEvent<HTMLInputElement>) => read(e.target.files?.[0])} />
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => input.current?.click()}>
        <UploadOutlined /> {busy ? t('cgpa.reading') : t('cgpa.upload')}
      </button>
    </div>
  );
}

function ImportPreview({ sheet, file, hasRecords, onCancel, onConfirm }: {
  sheet: ParsedSheet | null; file: string; hasRecords: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const { t, num } = useLang();
  if (!sheet) return null;
  const ours = totals(sheet.attempts);
  const checks = checkSheet(sheet);
  const wrong = checks.filter((c) => !c.ok);
  const matches = checks.length > 0 && wrong.length === 0;
  const program = detectProgram(sheet.program, file);
  const show = (k: string, v: number) => num(v, k === 'gpa' || k === 'cgpa' ? 2 : 0);

  return (
    <Modal open onCancel={onCancel} footer={null} title={t('cgpa.previewTitle')} width={600}>
      <p style={{ marginTop: 8 }}>{t('cgpa.previewFound', { courses: sheet.attempts.length, semesters: checks.length })}</p>
      {program && <p className="small" style={{ marginTop: 4 }}><b>{t('cgpa.program')}:</b> {program.name} ({t('cgpa.programCredits', { n: program.credits })})</p>}
      <div className="card pad" style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'flex-start', background: matches ? 'var(--lime-lo)' : 'var(--amber-lo)', borderColor: 'transparent' }}>
        {matches ? <CheckCircleFilled style={{ color: 'var(--lime-ink)', fontSize: 22, marginTop: 2 }} /> : <WarningFilled style={{ color: 'var(--amber)', fontSize: 22, marginTop: 2 }} />}
        <div style={{ color: 'var(--ink)' }}>
          <p style={{ fontWeight: 700 }}>
            {matches ? t('cgpa.checkAll', { n: checks.length, cgpa: num(ours.cgpa ?? 0, 2) })
              : checks.length ? t('cgpa.checkSome', { bad: wrong.length, n: checks.length })
                : t('cgpa.previewOurs', { ours: ours.cgpa != null ? num(ours.cgpa, 2) : t('cgpa.none') })}
          </p>
          {matches && <p className="small" style={{ marginTop: 4 }}>{t('cgpa.checkAllText')}</p>}
          {wrong.length > 0 && (
            <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {wrong.map((c) => (
                <li key={c.semester}><b>{c.semester}</b>:{' '}
                  {FIGURES.filter((k) => Math.abs(c.figures[k][0] - c.figures[k][1]) >= 0.001)
                    .map((k) => t('cgpa.checkLine', { what: t(`cgpa.fig_${k}`), ours: show(k, c.figures[k][0]), sheet: show(k, c.figures[k][1]) }))
                    .join('; ')}
                </li>
              ))}
            </ul>
          )}
          {wrong.length > 0 && <p className="small" style={{ marginTop: 8 }}>{t('cgpa.checkSomeText')}</p>}
        </div>
      </div>
      {sheet.guessed.length > 0 && <p className="small muted" style={{ marginTop: 12 }}>{t('cgpa.guessed', { list: sheet.guessed.join(', ') })}</p>}
      {hasRecords && <p className="small muted" style={{ marginTop: 12 }}>{t('cgpa.previewReplace')}</p>}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>{t('cgpa.useThese')}</button>
      </div>
    </Modal>
  );
}

const LEVEL_TOP: Record<string, number> = { freshman: 30, sophomore: 60, junior: 90, senior: 140 };
const LEVELS = ['freshman', 'sophomore', 'junior', 'senior', 'advancedSenior'];

function OverviewTab({ rows, attempts, probation, onUpload, onSample, empty }: {
  rows: TermRow[]; attempts: Attempt[]; probation?: number; onUpload: (s: ParsedSheet, f: string) => void; onSample: (() => void) | null; empty: boolean;
}) {
  const { t, num } = useLang();
  const [asTable, setAsTable] = useState(false);
  if (empty) {
    return (
      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        <Upload onRead={onUpload} />
        <Empty title={t('cgpa.emptyTitle')} text={t('cgpa.emptyText')}
          action={onSample ? <button type="button" className="btn btn-line" onClick={onSample}>{t('cgpa.trySample')}</button> : undefined} />
        <Quick />
      </div>
    );
  }
  const s = totals(attempts);
  const standing = standingOf(rows, probation);
  const level = levelOf(s.earned);
  const honour = honourOf(s.cgpa);
  const graded = rows.filter((r) => r.gpa !== null);
  const best = graded.reduce((b, r) => (r.gpa! > b.gpa! ? r : b), graded[0]);
  const worst = graded.reduce((b, r) => (r.gpa! < b.gpa! ? r : b), graded[0]);
  const signed = (h: number) => `${h > 0 ? '+' : '−'}${num(Math.abs(h) / 100, 2)}`;
  const up = rows.reduce<TermRow | null>((b, r) => ((r.change ?? 0) > (b?.change ?? 0) ? r : b), null);
  const down = rows.reduce<TermRow | null>((b, r) => ((r.change ?? 0) < (b?.change ?? 0) ? r : b), null);
  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <section className="card pad" aria-labelledby="trend">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 id="trend" style={{ fontSize: '1.15rem' }}>{t('cgpa.trend')}</h2>
          <span className="row" style={{ gap: 4 }}>
            <button type="button" className="btn btn-quiet btn-sm" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>{asTable ? t('cgpa.asChart') : t('cgpa.asTable')}</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => window.print()}><PrinterOutlined /> {t('cgpa.print')}</button>
          </span>
        </div>
        {asTable ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="scale-table">
              <thead><tr><th scope="col">{t('cgpa.semester')}</th><th scope="col">{t('cgpa.credits')}</th><th scope="col">GPA</th><th scope="col">CGPA</th><th scope="col">{t('cgpa.listCol')}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.semester}>
                    <th scope="row">{r.semester}</th>
                    <td>{num(r.attempted)}</td>
                    <td>{r.gpa !== null ? num(r.gpa, 2) : t('cgpa.none')}</td>
                    <td>{r.cgpa !== null ? num(r.cgpa, 2) : t('cgpa.none')}</td>
                    <td>{r.list ? <span className={`tag ${r.list === 'vc' ? 'violet' : 'lime'}`}>{r.list === 'vc' ? t('cgpa.vcShort') : t('cgpa.deanShort')}</span> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <CgpaChart rows={rows} />}
      </section>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12 }}>
        {best && <div className="card pad stat"><span>{t('cgpa.bestTerm')}</span><b style={{ color: 'var(--lime-ink)' }}>{num(best.gpa!, 2)}</b><span>{best.semester}</span></div>}
        {worst && <div className="card pad stat"><span>{t('cgpa.worstTerm')}</span><b style={{ color: worst.gpa! < 2 ? 'var(--coral)' : undefined }}>{num(worst.gpa!, 2)}</b><span>{worst.semester}</span></div>}
        <div className="card pad stat"><span>{t('cgpa.bestJump')}</span><b style={{ color: 'var(--lime-ink)' }}>{up ? signed(up.change!) : t('cgpa.none')}</b><span>{up?.semester ?? ''}</span></div>
        <div className="card pad stat"><span>{t('cgpa.bigDrop')}</span><b style={{ color: down ? 'var(--coral)' : undefined }}>{down ? signed(down.change!) : t('cgpa.none')}</b><span>{down?.semester ?? ''}</span></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
        {standing && (
          <section className="card pad" aria-labelledby="ov-standing">
            <h3 id="ov-standing" style={{ fontSize: '1rem' }}>{t('cgpa.standingH')}</h3>
            <p style={{ marginTop: 6 }}><span className={`tag ${standing.status === 'good' ? 'lime' : 'coral'}`}>{t(`cgpa.standing_${standing.status}`)}</span></p>
            <p className="small muted" style={{ marginTop: 6 }}>
              {standing.status === 'good' ? t('cgpa.standingGood', { line: num(standing.threshold, 2) })
                : t('cgpa.standingBelow', { n: standing.semestersBelow, allowed: standing.allowed, line: num(standing.threshold, 2) })}
            </p>
            {standing.policy === 'before2022' && <p className="small muted" style={{ marginTop: 4 }}>{t('cgpa.oldPolicy')}</p>}
          </section>
        )}
        <section className="card pad" aria-labelledby="ov-level">
          <h3 id="ov-level" style={{ fontSize: '1rem' }}>{t('cgpa.level')}</h3>
          <p style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '1.3rem', marginTop: 4 }}>{t(`cgpa.level_${level}`)}</p>
          <p className="small muted">{LEVEL_TOP[level] ? t('cgpa.toNextLevel', { n: LEVEL_TOP[level] + 1 - s.earned, next: t(`cgpa.level_${LEVELS[LEVELS.indexOf(level) + 1]}`) }) : t('cgpa.topLevel')}</p>
        </section>
        <section className="card pad" aria-labelledby="ov-honour">
          <h3 id="ov-honour" style={{ fontSize: '1rem' }}>{t('cgpa.distinction')}</h3>
          <p style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '1.3rem', marginTop: 4 }}>{honour ? t(`cgpa.honour_${honour}`) : t('cgpa.honour_none')}</p>
          <p className="small muted">{t('cgpa.distinctionText')}</p>
        </section>
      </div>
    </div>
  );
}

function CourseLine({ r, on, onGrade, onSave, onRemove }: {
  r: GradeRecord; on: boolean; onGrade: (g: string) => void; onSave: (next: Partial<GradeRecord>) => Promise<boolean>; onRemove: () => void;
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ code: r.code, title: r.title || '', credits: r.credits });
  if (editing) {
    return (
      <li className="course-edit">
        <input className="field edit-code" aria-label={t('cgpa.code')} maxLength={6} style={{ fontFamily: 'var(--mono)' }} value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/\s/g, '') })} />
        <input className="field edit-title" aria-label={t('cgpa.courseTitle')} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input className="field edit-credits" aria-label={t('cgpa.credits')} type="number" min={0} max={6} step={0.5} value={draft.credits}
          onChange={(e) => setDraft({ ...draft, credits: Number(e.target.value) })} />
        <span className="row edit-actions" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={async () => { if (await onSave(draft)) setEditing(false); }}>{t('common.save')}</button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setDraft({ code: r.code, title: r.title || '', credits: r.credits }); setEditing(false); }}>{t('common.cancel')}</button>
        </span>
      </li>
    );
  }
  return (
    <li className="link-row course-line" style={{ opacity: on ? 1 : 0.72 }}>
      <span className="code">{r.code}</span>
      <span className="course-name">
        <span style={{ display: 'block' }}>{r.title || r.code}</span>
        <span className="small muted">{t('common.credits', { n: r.credits })}{!on && <> · <span className="tag">{t('cgpa.nt')}</span></>}</span>
      </span>
      <select className="field" aria-label={`${t('cgpa.grade')}: ${r.code} ${r.semester}`} style={{ width: 'auto', minHeight: 38, fontFamily: 'var(--mono)' }}
        value={r.grade} onChange={(e) => onGrade(e.target.value)}>
        {ALL_GRADES.map((g) => <option key={g}>{g}</option>)}
      </select>
      <button type="button" className="icon-btn" aria-label={`${t('common.edit')}: ${r.code} ${r.semester}`} onClick={() => setEditing(true)}><EditOutlined /></button>
      <button type="button" className="icon-btn" aria-label={`${t('common.remove')}: ${r.code} ${r.semester}`} onClick={onRemove}><CloseOutlined /></button>
    </li>
  );
}

function TranscriptTab({ records, attempts, catalogue, add, remove, replaceAll, clear, onUpload }: {
  records: GradeRecord[];
  attempts: Attempt[];
  catalogue: CourseRef[];
  add: (r: GradeRecord) => Promise<void>;
  remove: (id: string) => Promise<void>;
  replaceAll: (list: GradeRecord[]) => Promise<void>;
  clear: () => Promise<void>;
  onUpload: (s: ParsedSheet, f: string) => void;
}) {
  const { t, num, errorText } = useLang();
  const [draft, setDraft] = useState({ code: '', credits: 3, grade: 'A', semester: recentSemesters()[1] });
  const known = catalogue.find((c) => c.code === draft.code.toUpperCase());
  const counted = new Set([...totals(attempts).counted.values()].map((a) => a.id));
  const opened = useRef({ cgpa: totals(attempts).cgpa, records: records.map(plainRecord) });
  const codeInput = useRef<HTMLInputElement>(null);
  const run = async (job: () => Promise<void>) => {
    try {
      await job();
      return true;
    } catch (err) {
      toast.error(errorText(err));
      return false;
    }
  };
  const others = (r: GradeRecord) => records.filter((x) => keyOf(x) !== keyOf(r)).map(plainRecord);
  const setGrade = (r: GradeRecord, grade: string) => run(() => add({ ...plainRecord(r), grade }));
  const saveCourse = (r: GradeRecord, next: Partial<GradeRecord>) => run(() => replaceAll([...others(r), plainRecord({ ...r, ...next })]));
  const replaceOrClear = (list: GradeRecord[]) => (list.length ? replaceAll(list) : clear());
  const dropSemester = (sem: string) => run(() => replaceOrClear(records.filter((x) => x.semester !== sem).map(plainRecord)));
  const undo = () => run(() => replaceOrClear(opened.current.records));
  const addHere = (sem: string) => {
    setDraft({ ...draft, semester: sem });
    codeInput.current?.scrollIntoView({ block: 'center' });
    codeInput.current?.focus();
  };
  const changed = sameList(records.map(plainRecord), opened.current.records) === false;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await add({ code: draft.code.trim().toUpperCase(), title: known?.title || '', credits: Number(draft.credits), grade: draft.grade, semester: draft.semester });
      setDraft({ ...draft, code: '' });
      toast.success(t('cgpa.added', { code: draft.code.toUpperCase() }));
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const bySemester = useMemo(() => {
    const groups = new Map<string, GradeRecord[]>();
    for (const r of records) groups.set(r.semester, [...(groups.get(r.semester) || []), r]);
    return [...groups.entries()].sort((a, b) => semesterIndex(b[0]) - semesterIndex(a[0]));
  }, [records]);

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <Upload onRead={onUpload} />
      <form onSubmit={save} className="card pad" aria-labelledby="add-title">
        <h2 id="add-title" style={{ fontSize: '1.1rem', marginBottom: 12 }}>{t('cgpa.addTitle')}</h2>
        <div className="form-grid add-grid">
          <div>
            <label htmlFor="ad-code" className="label">{t('cgpa.code')}</label>
            <input id="ad-code" ref={codeInput} className="field" list="catalogue" required maxLength={6} placeholder="CSE220" style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
              value={draft.code} onChange={(e) => {
                const code = e.target.value.toUpperCase();
                const match = catalogue.find((c) => c.code === code);
                setDraft({ ...draft, code, credits: match?.credits ?? draft.credits });
              }} />
            <datalist id="catalogue">{catalogue.map((c) => <option key={c.code} value={c.code}>{c.title}</option>)}</datalist>
          </div>
          <div>
            <label htmlFor="ad-credits" className="label">{t('cgpa.credits')}</label>
            <input id="ad-credits" type="number" min={0} max={6} step={0.5} className="field" value={draft.credits} onChange={(e) => setDraft({ ...draft, credits: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="ad-grade" className="label">{t('cgpa.grade')}</label>
            <select id="ad-grade" className="field" value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value })}>
              {ALL_GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ad-sem" className="label">{t('cgpa.semester')}</label>
            <select id="ad-sem" className="field" value={draft.semester} onChange={(e) => setDraft({ ...draft, semester: e.target.value })}>
              {recentSemesters(20).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>{known ? known.title : t('cgpa.addHint')}</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }}><PlusOutlined /> {t('cgpa.add')}</button>
      </form>

      {records.length === 0 ? <Empty title={t('cgpa.emptyTitle')} text={t('cgpa.emptyText')} /> : (
        <>
          {bySemester.map(([sem, list]) => {
            const gpa = gpaOf(semesterSums(toAttempts(list)));
            return (
              <section key={sem || 'none'} className="card pad" aria-label={sem || t('cgpa.noSemester')}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 style={{ fontSize: '1.05rem' }}>{sem || t('cgpa.noSemester')}</h3>
                  {gpa != null && <span className="small muted">GPA <b style={{ color: 'var(--ink)' }}>{num(gpa, 2)}</b></span>}
                </div>
                <ul className="list-plain">
                  {list.map((r) => (
                    <CourseLine key={keyOf(r)} r={r} on={counted.has(keyOf(r)) || r.grade === 'I' || r.grade === 'W'}
                      onGrade={(g) => setGrade(r, g)} onSave={(next) => saveCourse(r, next)} onRemove={() => r._id && remove(r._id)} />
                  ))}
                </ul>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => addHere(sem)}><PlusOutlined /> {t('cgpa.addHere')}</button>
                  <Confirm title={t('cgpa.removeSemesterQ', { sem: sem || t('cgpa.noSemester'), n: list.length })} onConfirm={() => dropSemester(sem)}>
                    <button type="button" className="btn btn-quiet btn-sm" style={{ color: 'var(--coral)' }}><DeleteOutlined /> {t('cgpa.removeSemester', { sem: sem || t('cgpa.noSemester') })}</button>
                  </Confirm>
                </div>
              </section>
            );
          })}
          <Confirm title={t('cgpa.clearQ')} onConfirm={clear}>
            <button type="button" className="btn btn-danger btn-sm" style={{ justifySelf: 'start' }}><DeleteOutlined /> {t('cgpa.clear')}</button>
          </Confirm>
          <LiveCgpa now={totals(attempts).cgpa} before={opened.current.cgpa} changed={changed} undoLabel={t('cgpa.undoChanges')} onUndo={undo} />
        </>
      )}
    </div>
  );
}

interface Row { key: string; code: string; title: string; credits: number; grade: string; dropped: boolean; added?: boolean }

const fromAttempts = (attempts: Attempt[]): Row[] =>
  [...totals(attempts).counted.values()]
    .sort((a, b) => semesterIndex(b.semester) - semesterIndex(a.semester) || a.code.localeCompare(b.code))
    .map((a) => ({ key: a.id, code: a.code, title: a.title || a.code, credits: a.credits, grade: a.grade, dropped: false }));

const cgpaOfRows = (rows: Row[]) =>
  totals(rows.filter((r) => !r.dropped).map((r) => ({ id: r.key, code: r.code || r.key, title: r.title, credits: r.credits, grade: r.grade as Grade, semester: 'Fall 2000' })));

function WhatIfTab({ attempts, rows, setRows }: { attempts: Attempt[]; rows: Row[]; setRows: (r: Row[]) => void }) {
  const { t, num } = useLang();
  const original = new Map(attempts.map((a) => [a.id, a.grade]));
  const set = (key: string, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const changed = rows.filter((r) => r.added || r.dropped || r.grade !== original.get(r.key)).length;
  const shown = rows.filter((r) => {
    const was = original.get(r.key) ?? r.grade;
    return r.added || (was in GRADE_POINTS && gp(was) < 4 && r.credits > 0);
  });
  const hidden = rows.length - shown.length;
  const sandbox = cgpaOfRows(rows).cgpa;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <div className="card pad row" style={{ justifyContent: 'space-between' }}>
        <p className="muted" style={{ flex: '1 1 320px' }}>{t('cgpa.whatIfText')}</p>
        <div className="row">
          <button type="button" className="btn btn-line btn-sm"
            onClick={() => setRows([...rows, { key: `new${Date.now()}`, code: '', title: t('cgpa.futureCourse'), credits: 3, grade: 'A', dropped: false, added: true }])}>
            <PlusOutlined /> {t('cgpa.addFuture')}
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRows(fromAttempts(attempts))} disabled={!changed}><UndoOutlined /> {t('cgpa.reset')}</button>
        </div>
      </div>
      {shown.length === 0 ? <Empty title={t('cgpa.allGoodTitle')} text={t('cgpa.allGoodText')} /> : (
        <ul className="card list-plain" style={{ padding: '4px 14px' }}>
          {shown.map((r) => {
            const was = original.get(r.key);
            return (
              <li key={r.key} className="link-row whatif-row" style={{ opacity: r.dropped ? 0.55 : 1 }}>
                {r.added ? (
                  <input className="field" aria-label={t('cgpa.code')} placeholder={t('cgpa.futureCode')} maxLength={6} style={{ width: 110, fontFamily: 'var(--mono)', minHeight: 38 }}
                    value={r.code} onChange={(e) => set(r.key, { code: e.target.value.toUpperCase() })} />
                ) : <span className="code">{r.code}</span>}
                <span style={{ flex: 1, minWidth: 0, textDecoration: r.dropped ? 'line-through' : undefined }}>
                  <span style={{ display: 'block' }}>{r.title}</span>
                  {was && was !== r.grade && <span className="small muted">{t('cgpa.was', { grade: was })}</span>}
                </span>
                {r.added ? (
                  <select className="field" aria-label={`${t('cgpa.credits')}: ${r.code || r.title}`} style={{ width: 'auto', minHeight: 38 }} value={r.credits} onChange={(e) => set(r.key, { credits: Number(e.target.value) })}>
                    {[1, 1.5, 2, 3, 4].map((c) => <option key={c} value={c}>{t('common.credits', { n: c })}</option>)}
                  </select>
                ) : <span className="small muted only-wide">{t('common.credits', { n: r.credits })}</span>}
                <select className="field" aria-label={`${t('cgpa.grade')}: ${r.code || r.title}`} style={{ width: 'auto', minHeight: 38, fontFamily: 'var(--mono)' }} value={r.grade}
                  onChange={(e) => set(r.key, { grade: e.target.value })} disabled={r.dropped}>
                  {ALL_GRADES.map((g) => <option key={g}>{g}</option>)}
                </select>
                <button type="button" className="icon-btn" aria-pressed={r.dropped}
                  aria-label={`${r.added ? t('common.remove') : r.dropped ? t('cgpa.putBack') : t('cgpa.drop')}: ${r.code || r.title}`}
                  onClick={() => (r.added ? setRows(rows.filter((x) => x.key !== r.key)) : set(r.key, { dropped: !r.dropped }))}>
                  {r.dropped ? <UndoOutlined /> : <CloseOutlined />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="small muted">{hidden > 0 && t('cgpa.hiddenGood', { n: hidden })} {t('cgpa.whatIfNote', { n: num(changed) })}</p>
      <LiveCgpa now={sandbox} before={totals(attempts).cgpa} undoLabel={t('cgpa.reset')} onUndo={() => setRows(fromAttempts(attempts))} />
    </div>
  );
}

function statusOf(c: Candidate, next: string, t: (k: string, v?: Record<string, string | number>) => string) {
  if (c.allowed === 'yes') return { tone: 'lime', text: c.kind === 'retake' ? t('cgpa.st_retake') : t('cgpa.st_repeatBy', { sem: c.lastChance! }) };
  if (c.allowed === 'permission') {
    if (c.why === 'thirdRetake') return { tone: 'amber', text: t('cgpa.st_third') };
    return { tone: 'amber', text: t('cgpa.st_permission', { n: semesterIndex(next) - semesterIndex(c.firstSemester) }) };
  }
  return { tone: 'coral', text: t('cgpa.st_repeatedOnce') };
}

function RepeatTab({ attempts, next, setNext, latest }: { attempts: Attempt[]; next: string; setNext: (s: string) => void; latest: string }) {
  const { t, num, lang } = useLang();
  const said = (g: LetterGrade) => (lang === 'bn' ? g : g.startsWith('A') ? `an ${g}` : `a ${g}`);
  const [scope, setScope] = useState<'window' | 'all'>('window');
  const [count, setCount] = useState(3);
  const [hope, setHope] = useState<LetterGrade>('A');
  const [picked, setPicked] = useState<Record<string, LetterGrade | undefined>>({});
  const s = totals(attempts);
  const all = useMemo(() => candidates(attempts, next, hope), [attempts, next, hope]);
  const pool = all.filter((c) => (scope === 'window' ? c.allowed === 'yes' : c.allowed !== 'no'));
  const max = Math.max(1, Math.min(10, pool.length));
  useEffect(() => {
    if (count > max) setCount(max);
  }, [count, max]);
  if (s.cgpa === null) return <Empty title={t('cgpa.emptyTitle')} text={t('cgpa.emptyText')} />;

  const plans = scenarios(s.sums, all, count);
  const plan = scope === 'window' ? plans.rules : plans.permission;
  const change = plan.cgpa !== null ? diff(plan.cgpa, s.cgpa) : 0;
  const chosen = pool.filter((c) => picked[c.attempt.id]);
  const mine = cgpaWithGains(s.sums, chosen.map((c) => gainFor(c.attempt, picked[c.attempt.id]!)));
  const options = [0, 1, 2, 3].map((i) => semesterName(semesterIndex(latest) + 1 + i));

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <p className="lead" style={{ margin: 0 }}>{t('cgpa.repeatExplain')}</p>
      <section className="card pad" aria-label={t('cgpa.repeatControls')}>
        <div className="tabs" role="radiogroup" aria-label={t('cgpa.scope')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <button type="button" role="radio" className="tab" aria-checked={scope === 'window'} aria-selected={scope === 'window'} style={{ justifyContent: 'center' }} onClick={() => setScope('window')}>{t('cgpa.scopeWindow')}</button>
          <button type="button" role="radio" className="tab" aria-checked={scope === 'all'} aria-selected={scope === 'all'} style={{ justifyContent: 'center' }} onClick={() => setScope('all')}>{t('cgpa.scopeAll')}</button>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>{scope === 'window' ? t('cgpa.scopeWindowText', { sem: next }) : t('cgpa.scopeAllText')}</p>
        <div className="form-grid" style={{ marginTop: 12, alignItems: 'end' }}>
          <div>
            <span className="label" id="count-label">{t('cgpa.howMany')}</span>
            <div className="stepper" role="group" aria-labelledby="count-label">
              <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} aria-label={t('cgpa.fewer')}>{'−'}</button>
              <output aria-live="polite">{num(count)}</output>
              <button type="button" onClick={() => setCount((c) => Math.min(max, c + 1))} disabled={count >= max} aria-label={t('cgpa.more')}>+</button>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="rp-hope">{t('cgpa.ifIGet')}</label>
            <select id="rp-hope" className="field" style={{ fontFamily: 'var(--mono)' }} value={hope} onChange={(e) => setHope(e.target.value as LetterGrade)}>
              {HOPES.map((g) => <option key={g} value={g}>{g} ({num(GRADE_POINTS[g], 1)})</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rp-next">{t('cgpa.planningFor')}</label>
            <select id="rp-next" className="field" value={next} onChange={(e) => setNext(e.target.value)}>
              {options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 10 }} aria-label={t('cgpa.compare')}>
        {([['rules', plans.rules], ['permission', plans.permission], ['retakes', plans.retakes]] as const).map(([k, pl]) => (
          <div key={k} className="card pad stat" style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 4, borderColor: (k === 'rules' && scope === 'window') || (k === 'permission' && scope === 'all') ? 'var(--violet)' : undefined }}>
            <span style={{ fontWeight: 700 }}>{t(`cgpa.cmp_${k}`)}</span>
            <span>{pl.chosen.length ? t(k === 'retakes' ? 'cgpa.cmpRetakes' : 'cgpa.cmpCourses', { n: pl.chosen.length }) : t('cgpa.cmpNone')}</span>
            <b style={{ alignSelf: 'end' }}>{pl.chosen.length ? num(pl.cgpa!, 2) : num(s.cgpa!, 2)}</b>
          </div>
        ))}
      </div>

      {pool.length === 0 ? <Empty title={t('cgpa.noRetakeTitle')} text={t(scope === 'window' ? 'cgpa.noneInWindow' : 'cgpa.noRetakeText', { grade: hope })} /> : (
        <section className="card pad" aria-labelledby="best-plan" style={{ borderColor: 'var(--violet)' }}>
          <p className="small muted">{t('cgpa.bestPlan', { n: plan.chosen.length, grade: said(hope) })}</p>
          <p style={{ marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '2.4rem', color: 'var(--violet)' }} id="best-plan">{num(plan.cgpa!, 2)}</span>{' '}
            {change > 0 && <span className="tag lime">+{num(change, 2)}</span>}
          </p>
          <p className="small muted">{t('cgpa.nowLine', { cgpa: num(s.cgpa, 2) })}</p>
          {plan.chosen.length < count && <p className="small" style={{ color: 'var(--amber)', fontWeight: 700 }}>{t('cgpa.onlyN', { n: plan.chosen.length, want: count })}</p>}
          <ul className="list-plain" style={{ marginTop: 8 }}>
            {plan.chosen.map((c) => {
              const st = statusOf(c, next, t);
              return (
                <li key={c.attempt.id} className="link-row">
                  <span className="code">{c.attempt.code}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{c.attempt.title || c.attempt.code} <span className="small muted">{c.attempt.grade} {'→'} {hope}, {t('cgpa.firstTaken', { sem: c.firstSemester })}</span></span>
                  <span className={`tag ${st.tone}`}>{st.text}</span>
                </li>
              );
            })}
          </ul>
          {plan.steps.length > 1 && (
            <p className="small muted" style={{ marginTop: 8 }}>
              {t('cgpa.stepsLine')} {plan.steps.map((st) => t('cgpa.stepItem', { n: st.count, cgpa: num(st.cgpa!, 2) })).join(' · ')}
            </p>
          )}
        </section>
      )}

      {pool.length > 0 && (
        <section className="card pad" aria-labelledby="pick">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div style={{ flex: '1 1 280px' }}>
              <h2 id="pick" style={{ fontSize: '1.1rem' }}>{t('cgpa.pickTitle')}</h2>
              <p className="small muted" style={{ marginTop: 4 }}>{t('cgpa.pickText')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="small muted">{chosen.length ? t('cgpa.yourPick', { n: chosen.length }) : t('cgpa.pickNone')}</p>
              <p style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '1.9rem' }} aria-live="polite">{num(mine.cgpa ?? s.cgpa, 2)}</p>
            </div>
          </div>
          <ul className="list-plain" style={{ marginTop: 8 }}>
            {pool.map((c) => {
              const st = statusOf(c, next, t);
              const on = !!picked[c.attempt.id];
              const alone = cgpaWithGains(s.sums, [gainFor(c.attempt, picked[c.attempt.id] ?? hope)]).cgpa!;
              return (
                <li key={c.attempt.id} className="link-row" style={{ alignItems: 'flex-start' }}>
                  <input type="checkbox" id={`pk-${c.attempt.id}`} checked={on} style={{ width: 20, height: 20, marginTop: 4, accentColor: 'var(--violet)' }}
                    onChange={() => setPicked((p) => ({ ...p, [c.attempt.id]: on ? undefined : hope }))} />
                  <label htmlFor={`pk-${c.attempt.id}`} style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700 }}><span className="code" style={{ marginRight: 6 }}>{c.attempt.code}</span>{c.attempt.title}</span>
                    <span className="small muted">{t('cgpa.pickLine', { grade: c.attempt.grade, sem: c.attempt.semester, credits: c.attempt.credits })} </span>
                    <span className={`tag ${st.tone}`} style={{ whiteSpace: 'normal' }}>{st.text}</span>
                  </label>
                  {on && (
                    <select className="field" style={{ width: 'auto', minHeight: 34, fontFamily: 'var(--mono)' }} aria-label={t('cgpa.gradeFor', { code: c.attempt.code })}
                      value={picked[c.attempt.id]} onChange={(e) => setPicked((p) => ({ ...p, [c.attempt.id]: e.target.value as LetterGrade }))}>
                      {HOPES.filter((g) => GRADE_POINTS[g] > gp(c.attempt.grade)).map((g) => <option key={g}>{g}</option>)}
                    </select>
                  )}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem' }} title={t('cgpa.aloneTitle')}>{num(alone, 2)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <p className="small muted">{t('cgpa.retakeNote')}</p>
    </div>
  );
}

function TargetTab({ attempts, next, needed, onRepeat }: { attempts: Attempt[]; next: string; needed: number | null; onRepeat: () => void }) {
  const { t, num } = useLang();
  const s = totals(attempts);
  const [target, setTarget] = useState(() => Math.min(4, Math.max(2, Math.ceil(((s.cgpa ?? 3) + 0.1) * 20) / 20)));
  const [left, setLeft] = useState(() => Math.max(0, (needed ?? 136) - s.earned));
  useEffect(() => {
    if (needed) setLeft(Math.max(0, needed - s.earned));
  }, [needed, s.earned]);

  const pool = candidates(attempts, next, 'A');
  const byRules = pool.filter((c) => c.allowed === 'yes');
  const withPermission = pool.filter((c) => c.allowed !== 'no');
  const plan = planTarget(s.sums, left, target, byRules);
  const need = left > 0 ? (target - 0.0055) * (s.sums.credits / 100 + left) / left - s.sums.points / 1000 / left : null;
  const g = (x: LetterGrade) => `${x} (${num(GRADE_POINTS[x], 2)})`;

  let body: React.ReactNode;
  if (s.cgpa !== null && s.cgpa >= target && (left === 0 || (need !== null && need <= 0))) {
    body = <p className="card pad" style={{ background: 'var(--lime-lo)', borderColor: 'transparent', color: 'var(--ink)' }}>{t('cgpa.alreadyThere', { target: num(target, 2) })}</p>;
  } else if (plan.reachable) {
    body = (
      <>
        {need !== null && (
          <div className="card pad" style={{ background: 'var(--sunken)', borderColor: 'transparent' }}>
            <p className="small muted">{t('cgpa.youNeed', { credits: left })}</p>
            <p style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '2.2rem', color: 'var(--violet)' }}>{num(Math.max(0, Math.ceil(need * 100 - 1e-9) / 100), 2)}</p>
          </div>
        )}
        <h3 style={{ fontSize: '1.05rem', marginTop: 4 }}>{t('cgpa.waysTitle', { n: plan.courses.length })}</h3>
        <ul className="list-plain">
          {plan.mixes.map((m) => (
            <li key={`${m.high}${m.highCourses}${m.low}`} className="link-row" style={{ justifyContent: 'space-between' }}>
              <span>{m.lowCourses === 0 ? t('cgpa.wayAll', { n: m.highCourses, grade: g(m.high) })
                : t(m.highCourses === 1 ? 'cgpa.wayMixOne' : 'cgpa.wayMix', { high: m.highCourses, hg: g(m.high), low: m.lowCourses, lg: g(m.low) })}</span>
              <b style={{ fontFamily: 'var(--mono)' }}>{num(m.cgpa, 2)}</b>
            </li>
          ))}
        </ul>
        <p className="hint">{t('cgpa.waysNote')}</p>
      </>
    );
  } else {
    const loose = plan.repeats ? plan : planTarget(s.sums, left, target, withPermission);
    const fix = plan.repeats ?? loose.repeats;
    const best = Math.max(plan.best ?? 0, loose.best ?? 0, plan.allFour ?? 0);
    body = (
      <>
        <div className="card pad" style={{ background: 'var(--amber-lo)', borderColor: 'transparent', color: 'var(--ink)' }}>
          <p style={{ fontWeight: 800 }}>{t('cgpa.notPossible', { target: num(target, 2) })}</p>
          <p className="small" style={{ marginTop: 4 }}>{left > 0 ? t('cgpa.notPossibleText', { n: plan.courses.length, cgpa: num(plan.allFour ?? 0, 2) }) : t('cgpa.noneLeftText')}</p>
        </div>
        {fix ? (
          <div className="card pad">
            <h3 style={{ fontSize: '1.05rem' }}>{t('cgpa.fixTitle', { n: fix.chosen.length })}</h3>
            <p className="small muted" style={{ marginTop: 4 }}>{left > 0 ? t('cgpa.fixText', { n: plan.courses.length }) : t('cgpa.fixTextNoLeft')}</p>
            <ul className="list-plain" style={{ marginTop: 6 }}>
              {fix.chosen.map((c) => (
                <li key={c.attempt.id} className="link-row">
                  <span className="code">{c.attempt.code}</span>
                  <span style={{ flex: 1 }} className="small muted">{c.attempt.grade} {'→'} A · {t(`cgpa.kind_${c.kind}`)}</span>
                  {c.allowed === 'permission' && <span className="tag amber">{t('cgpa.st_permissionShort')}</span>}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 8 }}>{t('cgpa.fixResult')} <b style={{ fontFamily: 'var(--mono)', fontSize: '1.2rem' }}>{num(fix.cgpa ?? 0, 2)}</b></p>
            <button type="button" className="btn btn-line btn-sm" style={{ marginTop: 8 }} onClick={onRepeat}>{t('cgpa.fixOpen')}</button>
          </div>
        ) : <p>{t('cgpa.lower', { best: num(best, 2) })}</p>}
      </>
    );
  }

  return (
    <section className="card pad stack" aria-labelledby="tg-title">
      <h2 id="tg-title" style={{ fontSize: '1.2rem' }}>{t('cgpa.targetTitle')}</h2>
      <div className="row">
        {[2, 3.5, 3.65, 3.8].map((v) => (
          <button key={v} type="button" className="btn btn-line btn-sm" aria-pressed={target === v} onClick={() => setTarget(v)}>{num(v, 2)} <span className="small muted">{t(`cgpa.band_${String(v).replace('.', '_')}`)}</span></button>
        ))}
      </div>
      <div className="form-grid">
        <div>
          <label htmlFor="tg-cgpa" className="label">{t('cgpa.targetCgpa')}</label>
          <input id="tg-cgpa" type="number" className="field" min={1} max={4} step={0.01} value={target} onChange={(e) => setTarget(Math.min(4, Math.max(0, Number(e.target.value) || 0)))} />
        </div>
        <div>
          <label htmlFor="tg-left" className="label">{t('cgpa.creditsLeft')}</label>
          <input id="tg-left" type="number" className="field" min={0} max={220} value={left} onChange={(e) => setLeft(Math.max(0, Number(e.target.value) || 0))} />
          <p className="hint">{t('cgpa.creditsLeftHint', { n: s.earned })}</p>
        </div>
      </div>
      {body}
    </section>
  );
}

interface NextRow { key: number; credits: number; grade: LetterGrade }
let nextKey = 0;

function NextSemester({ sums }: { sums: Sums }) {
  const { t, num } = useLang();
  const [rows, setRows] = useState<NextRow[]>(() => [0, 1, 2, 3].map(() => ({ key: nextKey++, credits: 3, grade: 'A-' as LetterGrade })));
  const set = (key: number, patch: Partial<NextRow>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const term = gpaOf(rows.reduce((acc, r) => add(acc, r.grade, r.credits), { points: 0, credits: 0 }));
  const before = gpaOf(sums);
  const after = gpaOf(rows.reduce((acc, r) => add(acc, r.grade, r.credits), sums));
  const credits = rows.reduce((n, r) => n + r.credits, 0);
  const change = before !== null && after !== null ? diff(after, before) : 0;
  return (
    <section className="card pad" aria-labelledby="ns-title">
      <h2 id="ns-title" style={{ fontSize: '1.15rem' }}>{t('cgpa.nextTitle')}</h2>
      <p className="small muted" style={{ marginTop: 4 }}>{t('cgpa.nextText')}</p>
      <div className="stack" style={{ '--gap': '8px', marginTop: 10 } as React.CSSProperties}>
        {rows.map((r, i) => (
          <div key={r.key} className="row" style={{ flexWrap: 'nowrap' }}>
            <span className="small muted" style={{ width: 20, fontFamily: 'var(--mono)' }}>{num(i + 1)}</span>
            <select className="field" aria-label={t('cgpa.creditsFor', { n: i + 1 })} value={r.credits} onChange={(e) => set(r.key, { credits: Number(e.target.value) })}>
              {[1, 1.5, 2, 3, 4].map((c) => <option key={c} value={c}>{t('common.credits', { n: c })}</option>)}
            </select>
            <select className="field" style={{ fontFamily: 'var(--mono)' }} aria-label={t('cgpa.gradeForRow', { n: i + 1 })} value={r.grade} onChange={(e) => set(r.key, { grade: e.target.value as LetterGrade })}>
              {LETTER_GRADES.map((g) => <option key={g} value={g}>{g} ({num(GRADE_POINTS[g], 1)})</option>)}
            </select>
            <button type="button" className="icon-btn" aria-label={t('cgpa.removeRow', { n: i + 1 })} disabled={rows.length <= 1} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}><CloseOutlined /></button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-quiet btn-sm" style={{ marginTop: 8 }} disabled={rows.length >= 7} onClick={() => setRows((x) => [...x, { key: nextKey++, credits: 3, grade: 'A-' }])}><PlusOutlined /> {t('cgpa.addRow')}</button>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 10, marginTop: 12 }}>
        <div className="card pad stat" style={{ background: 'var(--sunken)', borderColor: 'transparent' }}><span>{t('cgpa.termGpa')}</span><b>{num(term ?? 0, 2)}</b></div>
        <div className="card pad stat" style={{ background: 'var(--sunken)', borderColor: 'transparent' }}>
          <span>{before !== null ? t('cgpa.newCgpa') : t('cgpa.firstCgpa')}</span>
          <b>{num(after ?? 0, 2)} {change !== 0 && <span className={`tag ${change > 0 ? 'lime' : 'coral'}`}>{change > 0 ? '+' : '\u2212'}{num(Math.abs(change), 2)}</span>}</b>
        </div>
        <div className="card pad stat" style={{ background: 'var(--sunken)', borderColor: 'transparent' }}>
          <span>{t('cgpa.load')}</span><b>{num(credits)}</b>
          {credits > 15 && <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{t('cgpa.overLoad')}</span>}
          {credits < 9 && <span>{t('cgpa.underLoad')}</span>}
        </div>
      </div>
    </section>
  );
}

function Quick() {
  const { t, num } = useLang();
  const [cgpa, setCgpa] = useState(3.2);
  const [credits, setCredits] = useState(60);
  const [gpa, setGpa] = useState(3.5);
  const [termCredits, setTermCredits] = useState(12);
  const [old, setOld] = useState<LetterGrade>('C');
  const [fresh, setFresh] = useState<LetterGrade>('A');
  const [oldCredits, setOldCredits] = useState(3);
  const ok = credits > 0 && cgpa >= 0 && cgpa <= 4;
  const afterTerm = ok ? (cgpa * credits + gpa * termCredits) / (credits + termCredits) : null;
  const afterRetake = ok ? (cgpa * credits - GRADE_POINTS[old] * oldCredits + GRADE_POINTS[fresh] * oldCredits) / credits : null;
  const shown = (v: number | null) => (v === null ? t('cgpa.none') : num(Math.min(4, Math.max(0, Math.round(v * 100) / 100)), 2));
  return (
    <section className="card pad" aria-labelledby="q-title">
      <h2 id="q-title" style={{ fontSize: '1.15rem' }}>{t('cgpa.quickTitle')}</h2>
      <p className="small muted" style={{ marginTop: 4 }}>{t('cgpa.quickText')}</p>
      <div className="form-grid" style={{ marginTop: 10 }}>
        <div><label className="label" htmlFor="q-cgpa">{t('cgpa.qCgpa')}</label><input id="q-cgpa" className="field" type="number" min={0} max={4} step={0.01} value={cgpa} onChange={(e) => setCgpa(Number(e.target.value))} /></div>
        <div><label className="label" htmlFor="q-cr">{t('cgpa.qCredits')}</label><input id="q-cr" className="field" type="number" min={1} max={220} value={credits} onChange={(e) => setCredits(Number(e.target.value))} /><p className="hint">{t('cgpa.qCreditsHint')}</p></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12, marginTop: 12 }}>
        <div className="card pad" style={{ background: 'var(--sunken)', borderColor: 'transparent' }}>
          <h3 style={{ fontSize: '1rem' }}>{t('cgpa.qTermTitle')}</h3>
          <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
            <div style={{ flex: 1 }}><label className="label" htmlFor="q-gpa">GPA</label><input id="q-gpa" className="field" type="number" min={0} max={4} step={0.01} value={gpa} onChange={(e) => setGpa(Number(e.target.value))} /></div>
            <div style={{ flex: 1 }}><label className="label" htmlFor="q-tc">{t('cgpa.credits')}</label><input id="q-tc" className="field" type="number" min={1} max={24} value={termCredits} onChange={(e) => setTermCredits(Number(e.target.value))} /></div>
          </div>
          <p style={{ marginTop: 8 }}>{t('cgpa.qBecomes')} <b style={{ fontFamily: 'var(--mono)', fontSize: '1.2rem' }}>{shown(afterTerm)}</b></p>
        </div>
        <div className="card pad" style={{ background: 'var(--sunken)', borderColor: 'transparent' }}>
          <h3 style={{ fontSize: '1rem' }}>{t('cgpa.qRetakeTitle')}</h3>
          <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
            <div style={{ flex: 1 }}><label className="label" htmlFor="q-old">{t('cgpa.qOld')}</label><select id="q-old" className="field" value={old} onChange={(e) => setOld(e.target.value as LetterGrade)}>{LETTER_GRADES.map((g) => <option key={g}>{g}</option>)}</select></div>
            <div style={{ flex: 1 }}><label className="label" htmlFor="q-new">{t('cgpa.qNew')}</label><select id="q-new" className="field" value={fresh} onChange={(e) => setFresh(e.target.value as LetterGrade)}>{LETTER_GRADES.map((g) => <option key={g}>{g}</option>)}</select></div>
            <div style={{ flex: 1 }}><label className="label" htmlFor="q-oc">{t('cgpa.credits')}</label><input id="q-oc" className="field" type="number" min={1} max={6} value={oldCredits} onChange={(e) => setOldCredits(Number(e.target.value))} /></div>
          </div>
          <p style={{ marginTop: 8 }}>{t('cgpa.qBecomes')} <b style={{ fontFamily: 'var(--mono)', fontSize: '1.2rem' }}>{shown(afterRetake)}</b></p>
        </div>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>{t('cgpa.quickNote')}</p>
    </section>
  );
}

function RulesTab({ attempts }: { attempts: Attempt[] }) {
  const { t, num } = useLang();
  const s = attempts.length ? totals(attempts) : null;
  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
    <div className="split">
      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        {['formula', 'retake', 'repeat', 'nonGpa', 'lists', 'standing', 'graduate'].map((k) => (
          <section key={k} className="card pad">
            <h2 style={{ fontSize: '1.1rem' }}>{t(`cgpa.rule_${k}_h`)}</h2>
            <p className="muted" style={{ marginTop: 6 }}>{t(`cgpa.rule_${k}`)}</p>
          </section>
        ))}
      </div>
      <aside className="card pad" aria-labelledby="scale">
        <h2 id="scale" style={{ fontSize: '1.1rem', marginBottom: 8 }}>{t('cgpa.scale')}</h2>
        <table className="scale-table">
          <thead><tr><th scope="col">{t('cgpa.grade')}</th><th scope="col">{t('cgpa.marks')}</th><th scope="col">{t('cgpa.points')}</th></tr></thead>
          <tbody>
            {LETTER_GRADES.map((g) => {
              const [lo, hi] = MARKS[g];
              return (
                <tr key={g}>
                  <th scope="row">{g}</th>
                  <td>{g === 'A+' ? t('cgpa.rangeTop', { lo: num(lo) }) : g === 'F' ? t('cgpa.rangeBottom', { hi: num(hi) }) : t('cgpa.range', { lo: num(lo), hi: num(hi) })}</td>
                  <td>{num(GRADE_POINTS[g], 1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: 10 }}>{t('cgpa.aPlusNote')}</p>
      </aside>
    </div>
    <CgpaByHand sums={s ? s.sums : null} cgpa={s ? s.cgpa : null} />
    </div>
  );
}

export default function Cgpa() {
  const { t, num, errorText } = useLang();
  const { records, add, remove, replaceAll, clear, saved } = useTranscript();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'overview') as Tab;
  const [catalogue, setCatalogue] = useState<CourseRef[]>([]);
  const [sheet, setSheet] = useState<{ parsed: ParsedSheet; file: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [nextPick, setNextPick] = useState<string | null>(null);
  const program = useProgram();

  useEffect(() => {
    api.get('/courses').then((r) => setCatalogue(r.data)).catch(() => {});
  }, []);

  const attempts = useMemo(() => (records ? toAttempts(records) : []), [records]);
  const termRows = useMemo(() => timeline(attempts), [attempts]);

  useEffect(() => {
    setRows(fromAttempts(attempts));
  }, [attempts]);

  if (!records) return <div className="page"><Loading rows={3} /></div>;

  const go = (next: Tab) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true });
  const latest = termRows.length ? termRows[termRows.length - 1].semester : null;
  const next = nextPick && latest && semesterIndex(nextPick) > semesterIndex(latest) ? nextPick : latest ? nextSemester(latest) : null;
  const sandbox = cgpaOfRows(rows);
  const base = totals(attempts).exact;
  const dirty = sandbox.exact != null && base != null && Math.abs(sandbox.exact - base) > 1e-9;
  const has = attempts.length > 0 && totals(attempts).cgpa !== null;
  const left = has && program.needed ? program.needed - totals(attempts).earned : 0;
  const straightA = left > 0 ? projectedCgpa(totals(attempts).sums, left, 4) : null;

  const importSheet = async () => {
    if (!sheet) return;
    try {
      await replaceAll(sheet.parsed.attempts.map((a) => ({ code: a.code, title: a.title, credits: a.credits, grade: a.grade, semester: a.semester })));
      const found = detectProgram(sheet.parsed.program, sheet.file);
      if (found) program.setProgram(found.code);
      toast.success(t('cgpa.imported', { n: sheet.parsed.attempts.length }));
      setSheet(null);
      go('overview');
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  return (
    <div className="page">
      <PageHead eyebrow={t('cgpa.eyebrow')} title={t('cgpa.title')} lead={t('cgpa.lead')} />
      {!saved && (
        <p className="card pad small" style={{ marginBottom: 18, background: 'var(--violet-lo)', borderColor: 'transparent', color: 'var(--ink)' }}>
          {t('cgpa.visitorNote')} <Link to="/login" state={{ from: '/cgpa' }} style={{ fontWeight: 700 }}>{t('cgpa.visitorSignIn')}</Link>
        </p>
      )}

      <Summary attempts={attempts} rows={termRows} probation={program.program?.probation} after={tab === 'whatif' && dirty ? sandbox.cgpa : undefined} />

      {tab === 'overview' && straightA !== null && <p className="straight-a">{t('cgpa.straightA', { cgpa: num(straightA, 2) })}</p>}

      <div className="tabs scroll-tabs" role="tablist" style={{ margin: '20px 0' }}>
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" className="tab" aria-selected={tab === k} onClick={() => go(k)}>{t(`cgpa.tab_${k}`)}</button>
        ))}
      </div>

      <div className={has && tab !== 'rules' ? 'cgpa-layout' : undefined}>
        <div>
          {tab === 'overview' && (
            <OverviewTab rows={termRows} attempts={attempts} probation={program.program?.probation} empty={!has}
              onUpload={(parsed, file) => setSheet({ parsed, file })}
              onSample={saved || records.length ? null : () => { replaceAll(sampleTranscript().map(({ code, title, credits, grade, semester }) => ({ code, title, credits, grade, semester }))); program.setProgram('CSE'); }} />
          )}
          {tab === 'transcript' && <TranscriptTab records={records} attempts={attempts} catalogue={catalogue} add={add} remove={remove} replaceAll={replaceAll} clear={clear} onUpload={(parsed, file) => setSheet({ parsed, file })} />}
          {tab === 'whatif' && <WhatIfTab attempts={attempts} rows={rows} setRows={setRows} />}
          {tab === 'repeat' && (has && next && latest ? <RepeatTab attempts={attempts} next={next} setNext={setNextPick} latest={latest} /> : <Empty title={t('cgpa.emptyTitle')} text={t('cgpa.emptyText')} />)}
          {tab === 'target' && (
            <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
              {has && next && <TargetTab attempts={attempts} next={next} needed={program.needed} onRepeat={() => go('repeat')} />}
              {has && <NextSemester sums={totals(attempts).sums} />}
              <Quick />
            </div>
          )}
          {tab === 'rules' && <RulesTab attempts={attempts} />}
        </div>
        {has && tab !== 'rules' && <SidePanel attempts={attempts} rows={termRows} program={program} />}
      </div>

      <ImportPreview sheet={sheet?.parsed ?? null} file={sheet?.file ?? ''} hasRecords={records.length > 0} onCancel={() => setSheet(null)} onConfirm={importSheet} />
      <span className="sr-only" aria-live="polite">{tab === 'whatif' && dirty && sandbox.cgpa != null ? `${t('cgpa.withChanges')} ${num(sandbox.cgpa, 2)}` : ''}</span>
    </div>
  );
}
