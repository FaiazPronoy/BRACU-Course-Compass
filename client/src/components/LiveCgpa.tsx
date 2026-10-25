import { UndoOutlined } from '@ant-design/icons';
import { useLang } from '../i18n/LangContext';

export default function LiveCgpa({ now, before, changed: edited, hint = 'cgpa.liveHint', undoLabel, onUndo }: {
  now: number | null; before: number | null; changed?: boolean; hint?: string; undoLabel?: string; onUndo?: () => void;
}) {
  const { t, num } = useLang();
  const moved = now !== null && before !== null && Math.abs(now - before) >= 0.005;
  const changed = now !== null && before !== null && (edited ?? moved);
  const delta = moved ? now! - before! : 0;
  return (
    <div className="live" role="status" aria-live="polite">
      <div className="live-now">
        <span>{t('cgpa.liveNow')}</span>
        <b key={now ?? 'none'} className="live-number">{now !== null ? num(now, 2) : t('cgpa.none')}</b>
      </div>
      {changed ? (
        <>
          <p className="live-was">
            {t('cgpa.liveWas')} <b style={{ fontFamily: 'var(--mono)' }}>{num(before!, 2)}</b>
            {moved && <span className={`tag ${delta > 0 ? 'lime' : 'coral'}`}>{delta > 0 ? '+' : '−'}{num(Math.abs(delta), 2)}</span>}
          </p>
          {onUndo && <button type="button" className="btn btn-line btn-sm" onClick={onUndo}><UndoOutlined /> {undoLabel}</button>}
        </>
      ) : <p className="live-was">{t(hint)}</p>}
    </div>
  );
}
