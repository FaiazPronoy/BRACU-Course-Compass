import {
  EyeInvisibleOutlined,
  EyeOutlined,
  GlobalOutlined,
  InboxOutlined,
  MoonOutlined,
  StarFilled,
  SunOutlined,
} from '@ant-design/icons';
import { Popconfirm } from 'antd';
import { ReactNode, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import { useAuth } from '../redux/store';
import { useTheme } from '../theme/ThemeContext';

export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  return (
    <Link to="/" className="brand" aria-label={`${t('common.brandTop')} ${t('common.brand')}`}>
      <img src="/compass.svg" alt="" width={36} height={36} />
      {!compact && (
        <span className="brand-name">
          <small>{t('common.brandTop')}</small>
          {t('common.brand')}
        </span>
      )}
    </Link>
  );
}

export function PageHead({ eyebrow, title, lead, action }: { eyebrow: string; title: string; lead?: string; action?: ReactNode }) {
  return (
    <header className={`page-head ${action ? 'with-action' : ''}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card empty">
      {icon || <InboxOutlined />}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

export function Loading({ rows = 3, height = 90 }: { rows?: number; height?: number }) {
  const { t } = useLang();
  return (
    <div className="stack" role="status" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

export function Stars({ value, label }: { value: number; label?: string }) {
  const { num } = useLang();
  const full = Math.round(value);
  return (
    <span className="stars" role="img" aria-label={label || `${num(value, 1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarFilled key={i} className={i <= full ? '' : 'off'} />
      ))}
    </span>
  );
}

export function Meter({ value, label, hot = false }: { value: number; label: string; hot?: boolean }) {
  const { num } = useLang();
  const on = Math.round(value);
  return (
    <span className={`meter ${hot && on >= 4 ? 'hot' : ''}`} role="img" aria-label={`${label}: ${num(value, 1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= on ? 'on' : ''} />
      ))}
    </span>
  );
}

const avatarColours = ['#C4F04A', '#B8A8FF', '#FFC7A6', '#8FE3CF', '#FFE08A', '#F4B6E0'];

export function Avatar({ name = '', size = 38 }: { name?: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const colour = avatarColours[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % avatarColours.length];
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, background: colour, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

export function CodeChip({ code, link = true }: { code: string; link?: boolean }) {
  return link ? (
    <Link to={`/courses/${code}`} className="code">
      {code}
    </Link>
  ) : (
    <span className="code">{code}</span>
  );
}

export function LangButton() {
  const { t, toggle } = useLang();
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={t('common.toOtherLang')} title={t('common.toOtherLang')}
      style={{ width: 'auto', padding: '0 12px', gap: 6, display: 'inline-flex', fontWeight: 700, fontSize: 14 }}>
      <GlobalOutlined /> {t('common.otherLang')}
    </button>
  );
}

export function ThemeButton() {
  const { t } = useLang();
  const { dark, toggle } = useTheme();
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={dark ? t('common.toLight') : t('common.toDark')}
      title={dark ? t('common.toLight') : t('common.toDark')}>
      {dark ? <SunOutlined /> : <MoonOutlined />}
    </button>
  );
}

export function PasswordField({ id, label, value, onChange, autoComplete = 'current-password', hint }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete?: string; hint?: string;
}) {
  const { t } = useLang();
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} className="field" type={shown ? 'text' : 'password'} value={value} required autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} style={{ paddingRight: 50 }} />
        <button type="button" className="icon-btn" onClick={() => setShown((s) => !s)} aria-pressed={shown}
          aria-label={shown ? t('auth.hidePw') : t('auth.showPw')} style={{ position: 'absolute', right: 3, top: 2 }}>
          {shown ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        </button>
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Confirm({ title, onConfirm, children }: { title: string; onConfirm: () => void; children: ReactNode }) {
  const { t } = useLang();
  return (
    <Popconfirm title={title} okText={t('common.yesDelete')} cancelText={t('common.cancel')} okButtonProps={{ danger: true }} onConfirm={onConfirm}>
      {children}
    </Popconfirm>
  );
}

export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { token, user } = useAuth();
  const location = useLocation();
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
