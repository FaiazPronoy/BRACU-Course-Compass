import {
  BellOutlined,
  BookOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  CloseOutlined,
  CompassOutlined,
  DashboardOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  MessageOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Dropdown, Popover } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Notification } from '../lib/types';
import { logout, updateUser } from '../redux/features/auth/authSlice';
import { inSite } from '../lib/paths';
import { useAppDispatch, useAuth } from '../redux/store';
import { Avatar, Brand, LangButton, ThemeButton } from './bits';
import CommandPalette from './CommandPalette';

function Notifications() {
  const { t, ago } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    api.get('/notifications').then((r) => {
      setItems(r.data.items);
      setUnread(r.data.unread);
    }).catch(() => {});
  }, []);

  useEffect(load, [load, location.pathname]);

  const onOpen = (next: boolean) => {
    setOpen(next);
    if (next && unread) {
      api.post('/notifications/read').then(() => setUnread(0)).catch(() => {});
    }
  };

  const content = (
    <div style={{ width: 'min(340px, 86vw)' }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>{t('notif.title')}</p>
      {items.length === 0 ? (
        <p className="muted small" style={{ padding: '10px 0' }}>{t('notif.empty')}</p>
      ) : (
        <ul className="list-plain" style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.map((n) => (
            <li key={n._id}>
              <button
                type="button"
                className="link-row"
                style={{ width: '100%', border: 0, background: n.read ? 'transparent' : 'var(--violet-lo)', font: 'inherit', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
                onClick={() => {
                  setOpen(false);
                  navigate(inSite(n.link));
                }}
              >
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block' }}>{t(`notif.${n.kind}`, { actor: n.actor, subject: n.subject })}</span>
                  <span className="muted small">{ago(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={onOpen} placement="bottomRight">
      <button type="button" className="icon-btn" aria-label={`${t('nav.notifications')}${unread ? ` (${unread})` : ''}`}>
        <BellOutlined />
        {unread > 0 && <span className="badge-dot">{unread}</span>}
      </button>
    </Popover>
  );
}

export default function Layout() {
  const { t } = useLang();
  const { token, user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheet, setSheet] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/auth/me').then((r) => dispatch(updateUser(r.data.user))).catch(() => {});
  }, [token, dispatch]);

  useEffect(() => {
    setSheet(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const signOut = async () => {
    await api.post('/auth/logout').catch(() => {});
    dispatch(logout());
    navigate('/');
  };

  const signedIn = !!(token && user);
  const links = signedIn
    ? [
        { to: '/', label: t('nav.home'), icon: <HomeOutlined />, end: true },
        { to: '/courses', label: t('nav.courses'), icon: <BookOutlined /> },
        { to: '/forum', label: t('nav.forum'), icon: <MessageOutlined /> },
        { to: '/planner', label: t('nav.planner'), icon: <CompassOutlined /> },
        { to: '/cgpa', label: t('nav.cgpa'), icon: <CalculatorOutlined /> },
        { to: '/study', label: t('nav.study'), icon: <CalendarOutlined /> },
      ]
    : [
        { to: '/courses', label: t('nav.courses'), icon: <BookOutlined /> },
        { to: '/forum', label: t('nav.forum'), icon: <MessageOutlined /> },
        { to: '/cgpa', label: t('nav.cgpa'), icon: <CalculatorOutlined /> },
      ];

  const accountItems = [
    { key: 'profile', icon: <UserOutlined />, label: t('nav.profile'), onClick: () => navigate('/profile') },
    ...(user?.role === 'admin' ? [{ key: 'admin', icon: <DashboardOutlined />, label: t('nav.admin'), onClick: () => navigate('/admin') }] : []),
    { type: 'divider' as const },
    { key: 'out', icon: <LogoutOutlined />, label: t('common.signOut'), danger: true, onClick: signOut },
  ];

  const navLink = (l: (typeof links)[number]) => (
    <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
      {l.icon}
      {l.label}
    </NavLink>
  );

  return (
    <>
      <a href="#main" className="skip btn btn-primary">{t('common.skip')}</a>
      <div className="topbar">
        <nav className="nav" aria-label={t('nav.main')}>
          <Brand />
          <div className="nav-links">{links.map(navLink)}</div>
          <div className="nav-tools">
            <button type="button" className="search-trigger only-wide" onClick={() => setPalette(true)} aria-label={t('common.search')}>
              <SearchOutlined /> {t('common.searchShort')} <kbd>Ctrl K</kbd>
            </button>
            <button type="button" className="icon-btn only-narrow" onClick={() => setPalette(true)} aria-label={t('common.search')}>
              <SearchOutlined />
            </button>
            <span className="only-wide"><LangButton /></span>
            <span className="only-wide"><ThemeButton /></span>
            {signedIn ? (
              <>
                <Notifications />
                <span className="only-wide">
                  <Dropdown menu={{ items: accountItems }} trigger={['click']} placement="bottomRight">
                    <button type="button" className="icon-btn" aria-label={t('nav.account')} style={{ width: 'auto', padding: 3 }}>
                      <Avatar name={user!.name} size={36} />
                    </button>
                  </Dropdown>
                </span>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-quiet btn-sm only-wide">{t('common.signIn')}</Link>
                <Link to="/login?mode=signup" className="btn btn-primary btn-sm only-wide" style={{ borderRadius: 999 }}>{t('common.join')}</Link>
              </>
            )}
            <button type="button" className="icon-btn only-narrow" onClick={() => setSheet((s) => !s)} aria-expanded={sheet}
              aria-label={sheet ? t('common.close') : t('common.menu')}>
              {sheet ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          </div>
        </nav>

        {sheet && (
          <div className="sheet rise">
            {links.map(navLink)}
            <hr className="divider" style={{ margin: '6px 0' }} />
            {signedIn ? (
              <>
                <NavLink to="/profile" className="nav-link"><UserOutlined /> {t('nav.profile')}</NavLink>
                {user!.role === 'admin' && <NavLink to="/admin" className="nav-link"><DashboardOutlined /> {t('nav.admin')}</NavLink>}
                <button type="button" className="nav-link" onClick={signOut} style={{ border: 0, background: 'none', font: 'inherit', color: 'var(--coral)', cursor: 'pointer' }}>
                  <LogoutOutlined /> {t('common.signOut')}
                </button>
              </>
            ) : (
              <div className="row" style={{ padding: 4 }}>
                <Link to="/login" className="btn btn-line" style={{ flex: 1 }}>{t('common.signIn')}</Link>
                <Link to="/login?mode=signup" className="btn btn-primary" style={{ flex: 1 }}>{t('common.join')}</Link>
              </div>
            )}
            <div className="row" style={{ padding: '4px 4px 0' }}>
              <LangButton />
              <ThemeButton />
            </div>
          </div>
        )}
      </div>

      <main id="main">
        <Outlet />
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="page" style={{ paddingTop: 28, paddingBottom: 28, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ maxWidth: 420 }}>
            <Brand />
            <p className="muted small" style={{ marginTop: 10 }}>{t('footer.line')}</p>
          </div>
          <nav aria-label="Footer" className="row">
            <Link to="/courses" className="btn btn-quiet btn-sm">{t('nav.courses')}</Link>
            <Link to="/forum" className="btn btn-quiet btn-sm">{t('nav.forum')}</Link>
            <Link to="/cgpa" className="btn btn-quiet btn-sm">{t('nav.cgpa')}</Link>
            {signedIn && <Link to="/planner" className="btn btn-quiet btn-sm">{t('nav.planner')}</Link>}
          </nav>
          <p className="muted small" style={{ flexBasis: '100%' }}>© {new Date().getFullYear()} {t('common.brandTop')} {t('common.brand')} · {t('footer.note')}</p>
          <p className="muted small" style={{ flexBasis: '100%', marginTop: 0 }}>{t('footer.madeBy')}</p>
        </div>
      </footer>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </>
  );
}
