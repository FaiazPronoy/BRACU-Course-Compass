import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import type { TermRow } from '../lib/engine/grades';

const H = 290;
const PAD = { top: 30, right: 14, bottom: 32, left: 36 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export default function CgpaChart({ rows }: { rows: TermRow[] }) {
  const { t, num } = useLang();
  const [box, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const data = rows.filter((r) => r.cgpa !== null);
  if (!data.length) return null;

  const low = Math.min(...data.flatMap((r) => [r.cgpa!, r.gpa ?? r.cgpa!]));
  const yMin = Math.max(0, Math.min(2, Math.floor((low - 0.25) * 2) / 2));
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / data.length;
  const x = (i: number) => PAD.left + step * i + step / 2;
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (4 - yMin)) * innerH;
  const barW = Math.min(30, step * 0.55);
  const tick = 4 - yMin > 2.5 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let v = Math.ceil(yMin / tick) * tick; v <= 4 + 1e-9; v += tick) ticks.push(Math.round(v * 100) / 100);
  const narrow = width < 520;
  const refs = [
    { v: 2, label: t('cgpa.chartProbation'), color: 'var(--coral)' },
    { v: 3.5, label: t('cgpa.chartDistinction'), color: 'var(--lime-ink)' },
    { v: 3.8, label: t('cgpa.chartHighest'), color: 'var(--lime-ink)' },
  ].filter((r) => r.v > yMin && r.v < 4);
  const up = data.reduce((b, r, i) => ((r.change ?? 0) > (b.c ?? 0) ? { i, c: r.change! } : b), { i: -1, c: 0 });
  const down = data.reduce((b, r, i) => ((r.change ?? 0) < (b.c ?? 0) ? { i, c: r.change! } : b), { i: -1, c: 0 });
  const every = Math.ceil(46 / step);
  const short = (name: string) => `${name.slice(0, 3)} ${name.slice(-2)}`;
  const path = data.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r.cgpa!).toFixed(1)}`).join(' ');
  const signed = (h: number) => `${h > 0 ? '+' : '−'}${num(Math.abs(h) / 100, 2)}`;
  const note = (i: number, text: string, color: string, above: boolean) => {
    const cx = x(i);
    const cy = y(data[i].cgpa!);
    return (
      <g aria-hidden="true">
        <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={2} />
        <text x={Math.min(Math.max(cx, PAD.left + 46), width - PAD.right - 46)} y={above ? Math.max(cy - 18, 14) : Math.min(cy + 30, H - PAD.bottom - 4)}
          textAnchor="middle" style={{ fill: color, fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>{text}</text>
      </g>
    );
  };
  const a = active !== null ? data[active] : null;

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} style={{ display: 'block', overflow: 'visible', fontFamily: 'var(--mono)' }} role="img"
        aria-label={t('cgpa.chartLabel', { from: data[0].semester, to: data[data.length - 1].semester, cgpa: num(data[data.length - 1].cgpa!, 2) })}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink-2)">{num(v, v % 1 ? 1 : 0)}</text>
          </g>
        ))}
        {refs.map((r) => <line key={r.v} x1={PAD.left} x2={width - PAD.right} y1={y(r.v)} y2={y(r.v)} stroke={r.color} strokeDasharray="5 5" opacity={0.8} />)}
        {data.map((r, i) => r.gpa !== null && (
          <rect key={r.semester} x={x(i) - barW / 2} y={y(r.gpa)} width={barW} height={Math.max(1, y(yMin) - y(r.gpa))} rx={5}
            fill={active === i ? 'var(--violet)' : 'var(--violet-lo)'} opacity={active === i ? 0.4 : 1} />
        ))}
        {refs.map((r) => (
          <text key={`l${r.v}`} x={width - PAD.right} y={y(r.v) - 5} textAnchor="end" fontSize={10}
            style={{ fill: r.color, paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>{num(r.v, 2)}{narrow ? '' : ` ${r.label}`}</text>
        ))}
        <path d={path} fill="none" stroke="var(--violet)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((r, i) => <circle key={r.semester} cx={x(i)} cy={y(r.cgpa!)} r={active === i ? 6.5 : 4.5} fill="var(--surface)" stroke="var(--violet)" strokeWidth={2.5} />)}
        {up.i > 0 && note(up.i, t('cgpa.chartJump', { n: signed(up.c) }), 'var(--lime-ink)', true)}
        {down.i > 0 && note(down.i, t('cgpa.chartDrop', { n: signed(down.c) }), 'var(--coral)', false)}
        {data.map((r, i) => (i % every === 0 || i === data.length - 1) && (
          <text key={`x${r.semester}`} x={x(i)} y={H - PAD.bottom + 18} textAnchor="middle" fontSize={11} fill="var(--ink-2)">{short(r.semester)}</text>
        ))}
        {data.map((r, i) => (
          <rect key={`h${r.semester}`} x={PAD.left + step * i} y={PAD.top} width={step} height={innerH} fill="transparent" tabIndex={0} role="button"
            aria-label={t('cgpa.chartPoint', { sem: r.semester, gpa: r.gpa !== null ? num(r.gpa, 2) : t('cgpa.none'), cgpa: num(r.cgpa!, 2) })}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} style={{ outline: 'none' }} />
        ))}
      </svg>
      {a && active !== null && (
        <div role="status" className="card" style={{ position: 'absolute', top: 0, left: Math.min(Math.max(x(active) - 85, 0), width - 170), width: 170, padding: '10px 12px', pointerEvents: 'none', fontSize: '0.86rem', boxShadow: '0 10px 30px -12px rgb(0 0 0 / 0.35)' }}>
          <b>{a.semester}</b>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">GPA</span><span style={{ fontFamily: 'var(--mono)' }}>{a.gpa !== null ? num(a.gpa, 2) : t('cgpa.none')}</span></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">CGPA</span><span style={{ fontFamily: 'var(--mono)' }}>{num(a.cgpa!, 2)}</span></div>
          {a.change ? <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('cgpa.chartChange')}</span><span style={{ fontFamily: 'var(--mono)', color: a.change > 0 ? 'var(--lime-ink)' : 'var(--coral)' }}>{signed(a.change)}</span></div> : null}
        </div>
      )}
      <div className="row small muted" style={{ gap: '6px 16px', marginTop: 8 }}>
        <span><i style={{ display: 'inline-block', width: 18, height: 3, background: 'var(--violet)', verticalAlign: 'middle', marginRight: 6 }} />{t('cgpa.chartCgpa')}</span>
        <span><i style={{ display: 'inline-block', width: 14, height: 10, borderRadius: 3, background: 'var(--violet-lo)', verticalAlign: 'middle', marginRight: 6 }} />{t('cgpa.chartGpa')}</span>
        <span><i style={{ display: 'inline-block', width: 18, borderTop: '2px dashed var(--coral)', verticalAlign: 'middle', marginRight: 6 }} />{t('cgpa.chartProbationKey')}</span>
      </div>
    </div>
  );
}
