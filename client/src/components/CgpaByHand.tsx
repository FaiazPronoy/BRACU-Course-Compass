import { useLang } from '../i18n/LangContext';
import type { Sums } from '../lib/engine/grades';

// the whole CGPA, step by step, so anyone can redo it on a phone calculator
export default function CgpaByHand({ sums, cgpa }: { sums: Sums | null; cgpa: number | null }) {
  const { t, num } = useLang();
  const steps = (keys: string[]) => (
    <ol className="how">
      {keys.map((k) => <li key={k}><b>{t(`cgpa.bh_${k}b`)}</b> {t(`cgpa.bh_${k}`)}</li>)}
    </ol>
  );
  const points = sums && cgpa !== null ? sums.points / 1000 : null;
  const credits = sums && cgpa !== null ? sums.credits / 100 : null;

  return (
    <section className="card pad by-hand" aria-labelledby="by-hand">
      <h2 id="by-hand" style={{ fontSize: '1.1rem' }}>{t('cgpa.bh_title')}</h2>
      <p className="muted">{t('cgpa.bh_text')}</p>

      <h3>{t('cgpa.bh_cgpaH')}</h3>
      {steps(['1', '2', '3', '4'])}
      {points !== null && credits !== null && (
        <p className="yours">
          {t('cgpa.bh_yours')}{' '}
          <span style={{ fontFamily: 'var(--mono)' }}>{num(points, 2)} ÷ {num(credits, credits % 1 ? 1 : 0)} = {num(points / credits, 4)}</span>
          {' '}{t('cgpa.bh_shownAs')} <b style={{ fontFamily: 'var(--mono)' }}>{num(cgpa!, 2)}</b>
        </p>
      )}

      <h3>{t('cgpa.bh_repeatH')}</h3>
      {steps(['r1', 'r2', 'r3'])}
      <p className="example">{t('cgpa.bh_rEx')}</p>

      <h3>{t('cgpa.bh_termH')}</h3>
      {steps(['t1', 't2'])}
      <p className="example">{t('cgpa.bh_tEx')}</p>
      <p className="small muted">{t('cgpa.bh_fromCgpa')}</p>
    </section>
  );
}
