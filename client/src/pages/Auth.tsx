import { CalculatorOutlined, CompassOutlined, DashboardOutlined, UserOutlined } from '@ant-design/icons';
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Brand, LangButton, PasswordField, ThemeButton } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import { DEPARTMENTS } from '../lib/grades';
import { inSite } from '../lib/paths';
import { setUser } from '../redux/features/auth/authSlice';
import { useAppDispatch, useAuth } from '../redux/store';

const DEMO = [
  { key: 'demoStudent', email: 'ayesha@g.bracu.ac.bd', password: 'Student@123', icon: <UserOutlined /> },
  { key: 'demoAdmin', email: 'admin@bracu.ac.bd', password: 'Admin@1234', icon: <DashboardOutlined /> },
];

export default function Auth() {
  const { t, errorText } = useLang();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>(params.get('mode') === 'signup' ? 'up' : 'in');
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'CSE' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = inSite((location.state as { from?: string } | null)?.from);

  if (token && !busy) {
    return (
      <main className="page center" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <div>
          <p style={{ fontSize: '1.1rem' }}>{t('auth.already')}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 14 }}>{t('auth.goHome')}</Link>
        </div>
      </main>
    );
  }

  const signIn = async (email: string, password: string, register = false) => {
    setBusy(true);
    setError('');
    try {
      const { data } = register
        ? await api.post('/auth/register', { ...form, email: email.trim() })
        : await api.post('/auth/login', { email: email.trim(), password });
      dispatch(setUser({ token: data.token, user: data.user }));
      toast.success(register ? t('auth.helloNew') : t('auth.hello', { name: data.user.name.split(' ')[0] }));
      navigate(data.user.role === 'admin' && from === '/' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signIn(form.email, form.password, mode === 'up');
  };

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="auth-page">
      <header className="auth-top">
        <Brand />
        <div className="row" style={{ gap: 2 }}>
          <LangButton />
          <ThemeButton />
        </div>
      </header>

      <main id="main" className="auth-main">
        <div className="auth-badge" aria-hidden="true"><CompassOutlined /></div>
        <h1 className="center" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', marginTop: 14 }}>{mode === 'in' ? t('auth.welcome') : t('auth.joinTitle')}</h1>
        <p className="muted center" style={{ marginTop: 8, maxWidth: 440, textWrap: 'balance' } as React.CSSProperties}>{mode === 'in' ? t('auth.welcomeSub') : t('auth.joinSub')}</p>

        <div className="card auth-card">
          <section aria-labelledby="demo-title">
            <h2 id="demo-title" className="center" style={{ fontSize: '1.05rem' }}>{t('auth.demoTitle')}</h2>
            <p className="muted small center" style={{ marginTop: 2 }}>{t('auth.demoText')}</p>
            <div className="demo-grid">
              {DEMO.map((d) => (
                <button key={d.key} type="button" className="demo-btn" disabled={busy} onClick={() => signIn(d.email, d.password)}>
                  <span className="demo-icon" aria-hidden="true">{d.icon}</span>
                  <span>
                    <b>{t(`auth.${d.key}`)}</b>
                    <span className="small muted">{t(`auth.${d.key}Sub`)}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <p className="auth-or"><span>{t('auth.or')}</span></p>

          <div className="tabs" role="tablist" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {(['in', 'up'] as const).map((m) => (
              <button key={m} type="button" role="tab" className="tab" aria-selected={mode === m} style={{ justifyContent: 'center' }}
                onClick={() => { setMode(m); setError(''); }}>
                {m === 'in' ? t('auth.tabIn') : t('auth.tabUp')}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="stack" style={{ marginTop: 20 }}>
            {mode === 'up' && (
              <div>
                <label htmlFor="au-name" className="label">{t('auth.name')}</label>
                <input id="au-name" className="field" value={form.name} onChange={(e) => set('name')(e.target.value)} required autoComplete="name" maxLength={60} />
              </div>
            )}
            <div>
              <label htmlFor="au-email" className="label">{t('auth.email')}</label>
              <input id="au-email" type="email" className="field" value={form.email} onChange={(e) => set('email')(e.target.value)} required autoComplete="email" placeholder="you@g.bracu.ac.bd" />
              {mode === 'up' && <p className="hint">{t('auth.emailHint')}</p>}
            </div>
            <PasswordField id="au-pw" label={t('auth.password')} value={form.password} onChange={set('password')}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'} hint={mode === 'up' ? t('auth.passwordHint') : undefined} />
            {mode === 'up' && (
              <div>
                <label htmlFor="au-dept" className="label">{t('auth.department')}</label>
                <select id="au-dept" className="field" value={form.department} onChange={(e) => set('department')(e.target.value)}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy} style={{ minHeight: 50 }}>
              {busy ? (mode === 'in' ? t('auth.signingIn') : t('auth.creating')) : mode === 'in' ? t('auth.submitIn') : t('auth.submitUp')}
            </button>
          </form>
        </div>

        <p className="auth-tagline center">{t('auth.tagline')}</p>
        <p className="center" style={{ marginTop: 10 }}>
          <Link to="/cgpa" className="btn btn-quiet btn-sm"><CalculatorOutlined /> {t('auth.cgpaNoAccount')}</Link>
        </p>
      </main>
    </div>
  );
}
