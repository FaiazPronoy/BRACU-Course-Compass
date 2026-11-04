import { DeleteOutlined, PlusOutlined, WarningFilled } from '@ant-design/icons';
import { FormEvent, useEffect, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { DAYS, type Day, findClashes, type Slot, validSlot } from '../lib/routine';

const KEY = 'compass-routine';

// The routine lives in this browser only. Section times change every
// semester and Connect has them; this is a scratch pad to check clashes.
function load(): Slot[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export default function RoutineBuilder({ codes }: { codes: string[] }) {
  const { t } = useLang();
  const [slots, setSlots] = useState<Slot[]>(load);
  const [code, setCode] = useState('');
  const [section, setSection] = useState('');
  const [days, setDays] = useState<Day[]>([]);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:20');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(slots));
    } catch {
      /* private mode: the routine just will not be remembered */
    }
  }, [slots]);

  const clashes = findClashes(slots);
  const clashCount = Object.keys(clashes).length;

  const add = (e: FormEvent) => {
    e.preventDefault();
    const next = { code: code.trim().toUpperCase().replace(/\s+/g, ''), section: section.trim(), days, start, end };
    if (!validSlot(next)) return setError(t('routine.invalid'));
    setError('');
    setSlots((list) => [...list, { ...next, id: `${Date.now()}` }]);
    setCode('');
    setSection('');
    setDays([]);
  };

  const toggleDay = (d: Day) => setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));
  const sorted = [...slots].sort((a, b) => DAYS.indexOf(a.days[0]) - DAYS.indexOf(b.days[0]) || a.start.localeCompare(b.start));

  return (
    <section className="card pad routine" aria-labelledby="routine-title">
      <h2 id="routine-title" style={{ fontSize: '1.25rem' }}>{t('routine.title')}</h2>
      <p className="muted small" style={{ marginTop: 4 }}>{t('routine.lead')}</p>

      <form onSubmit={add} className="routine-form">
        <div>
          <label htmlFor="rt-code" className="small">{t('routine.course')}</label>
          <input id="rt-code" className="field" list="rt-codes" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSE220" required />
          <datalist id="rt-codes">{codes.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label htmlFor="rt-sec" className="small">{t('routine.section')}</label>
          <input id="rt-sec" className="field" value={section} onChange={(e) => setSection(e.target.value)} placeholder="05" />
        </div>
        <fieldset className="routine-days">
          <legend className="small">{t('routine.days')}</legend>
          {DAYS.map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={days.includes(d)} onClick={() => toggleDay(d)}>
              {t(`routine.day${d}`)}
            </button>
          ))}
        </fieldset>
        <div>
          <label htmlFor="rt-start" className="small">{t('routine.start')}</label>
          <input id="rt-start" type="time" className="field" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="rt-end" className="small">{t('routine.end')}</label>
          <input id="rt-end" type="time" className="field" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
        <button className="btn btn-primary"><PlusOutlined /> {t('routine.add')}</button>
      </form>
      {error && <p className="small" role="alert" style={{ color: 'var(--coral)', marginTop: 8 }}>{error}</p>}

      {slots.length > 0 && (
        <>
          <p className="small" role="status" style={{ margin: '16px 0 8px', color: clashCount ? 'var(--coral)' : 'var(--ink-2)' }}>
            {clashCount ? <><WarningFilled /> {t('routine.clashes', { n: clashCount })}</> : t('routine.noClash')}
          </p>
          <table className="plain-table">
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className={clashes[s.id] ? 'clash' : undefined}>
                  <th scope="row"><span className="code">{s.code}</span>{s.section && <span className="muted small"> {t('routine.sec', { s: s.section })}</span>}</th>
                  <td>{s.days.map((d) => t(`routine.day${d}`)).join(', ')}</td>
                  <td>{s.start} to {s.end}</td>
                  <td className="small">
                    {clashes[s.id] && <span className="clash-note"><WarningFilled /> {t('routine.clashWith', { codes: clashes[s.id].join(', ') })}</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className="icon-btn" aria-label={t('routine.remove', { code: s.code })}
                      onClick={() => setSlots((list) => list.filter((x) => x.id !== s.id))}><DeleteOutlined /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
