import { CheckCircleFilled, LikeOutlined } from '@ant-design/icons';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, CodeChip, Loading, PageHead, PasswordField, Stars } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import { DEPARTMENTS } from '../lib/grades';
import type { CourseRef, Review, Thread } from '../lib/types';
import { updateUser } from '../redux/features/auth/authSlice';
import { useAppDispatch, useAuth } from '../redux/store';

export default function Profile() {
  const { t, num, ago, errorText } = useLang();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ name: user!.name, department: user!.department, studentId: user!.studentId || '', bio: user!.bio || '' });
  const [email, setEmail] = useState({ email: '', password: '' });
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '' });
  const [activity, setActivity] = useState<{ reviews: Review[]; threads: Thread[]; answers: number } | null>(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api.get('/me/activity').then((r) => setActivity(r.data)).catch(() => {});
  }, []);

  const run = (key: string, fn: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy('');
    }
  };

  const saveProfile = run('profile', async () => {
    const { data } = await api.patch('/me', form);
    dispatch(updateUser(data.user));
    toast.success(t('profile.saved'));
  });

  const saveEmail = run('email', async () => {
    const { data } = await api.post('/me/email', email);
    dispatch(updateUser(data.user));
    setEmail({ email: '', password: '' });
    toast.success(t('profile.emailChanged'));
  });

  const savePw = run('pw', async () => {
    await api.post('/me/password', pw);
    setPw({ oldPassword: '', newPassword: '' });
    toast.success(t('profile.pwChanged'));
  });

  return (
    <div className="page">
      <PageHead eyebrow={t('profile.eyebrow')} title={t('profile.title')} />

      <div className="split">
        <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <form onSubmit={saveProfile} className="card pad stack" aria-labelledby="pf-title">
            <div className="row" style={{ gap: 14 }}>
              <Avatar name={form.name} size={60} />
              <div>
                <h2 id="pf-title" style={{ fontSize: '1.4rem' }}>{user!.name}</h2>
                <p className="muted small">{user!.email} · <span className="tag violet">{user!.role === 'admin' ? t('admin.adminRole') : t('admin.student')}</span></p>
              </div>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="pf-name" className="label">{t('profile.name')}</label>
                <input id="pf-name" className="field" required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="pf-dept" className="label">{t('profile.department')}</label>
                <select id="pf-dept" className="field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pf-id" className="label">{t('profile.studentId')}</label>
                <input id="pf-id" className="field" inputMode="numeric" maxLength={8} value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value.replace(/\D/g, '') })} />
                <p className="hint">{t('profile.studentIdHint')}</p>
              </div>
            </div>
            <div>
              <label htmlFor="pf-bio" className="label">{t('profile.bio')}</label>
              <textarea id="pf-bio" className="field" style={{ minHeight: 90 }} maxLength={300} placeholder={t('profile.bioPh')} value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <button className="btn btn-primary" disabled={busy === 'profile'} style={{ justifySelf: 'start' }}>{busy === 'profile' ? t('common.saving') : t('profile.save')}</button>
          </form>

          <section className="card pad" aria-labelledby="act-title">
            <h2 id="act-title" style={{ fontSize: '1.3rem' }}>{t('profile.activity')}</h2>
            {!activity ? <Loading rows={2} height={50} /> : (
              <>
                <h3 style={{ fontSize: '1.05rem', margin: '16px 0 6px' }}>{t('profile.yourReviews')}</h3>
                {activity.reviews.length === 0 ? <p className="muted">{t('profile.noReviews')}</p> : (
                  <ul className="list-plain">
                    {activity.reviews.map((r) => {
                      const c = r.course as CourseRef;
                      return (
                        <li key={r._id}>
                          <Link to={`/courses/${c.code}?tab=reviews`} className="link-row">
                            <span className="code">{c.code}</span>
                            <span style={{ flex: 1, minWidth: 0 }}>{c.title}</span>
                            <Stars value={r.rating} />
                            <span className="small muted row" style={{ gap: 4 }}><LikeOutlined /> {num(r.helpfulCount)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <h3 style={{ fontSize: '1.05rem', margin: '20px 0 6px' }}>{t('profile.yourQuestions')}</h3>
                {activity.threads.length === 0 ? <p className="muted">{t('profile.noQuestions')}</p> : (
                  <ul className="list-plain">
                    {activity.threads.map((th) => (
                      <li key={th._id}>
                        <Link to={`/forum/${th._id}`} className="link-row">
                          <CodeChip code={th.course.code} link={false} />
                          <span style={{ flex: 1, minWidth: 0 }}>{th.title}</span>
                          {th.resolved && <CheckCircleFilled style={{ color: 'var(--lime-ink)' }} />}
                          <span className="small muted">{ago(th.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="muted small" style={{ marginTop: 14 }}>{num(activity.answers)} {t('profile.answersGiven')}</p>
              </>
            )}
          </section>
        </div>

        <aside className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <form onSubmit={saveEmail} className="card pad stack" aria-labelledby="em-title">
            <h2 id="em-title" style={{ fontSize: '1.15rem' }}>{t('profile.emailTitle')}</h2>
            <div>
              <label htmlFor="em-new" className="label">{t('profile.newEmail')}</label>
              <input id="em-new" type="email" className="field" required autoComplete="email" value={email.email} placeholder={user!.email}
                onChange={(e) => setEmail({ ...email, email: e.target.value })} />
            </div>
            <PasswordField id="em-pw" label={t('profile.currentPw')} value={email.password} onChange={(v) => setEmail({ ...email, password: v })} />
            <button className="btn btn-line" disabled={busy === 'email'}>{t('profile.changeEmail')}</button>
          </form>
          <form onSubmit={savePw} className="card pad stack" aria-labelledby="pw-title">
            <h2 id="pw-title" style={{ fontSize: '1.15rem' }}>{t('profile.pwTitle')}</h2>
            <PasswordField id="pw-old" label={t('profile.oldPw')} value={pw.oldPassword} onChange={(v) => setPw({ ...pw, oldPassword: v })} />
            <PasswordField id="pw-new" label={t('profile.newPw')} value={pw.newPassword} onChange={(v) => setPw({ ...pw, newPassword: v })}
              autoComplete="new-password" hint={t('auth.passwordHint')} />
            <button className="btn btn-line" disabled={busy === 'pw'}>{t('profile.changePw')}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
