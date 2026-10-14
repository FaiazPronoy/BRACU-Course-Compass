import { CompassOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="page center" style={{ paddingTop: 72, paddingBottom: 96 }}>
      <CompassOutlined aria-hidden style={{ fontSize: 56, color: 'var(--violet)' }} />
      <p className="code" style={{ margin: '18px auto 10px', display: 'inline-block' }}>404</p>
      <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)' }}>{t('notFound.title')}</h1>
      <p className="muted" style={{ maxWidth: 440, margin: '10px auto 24px' }}>{t('notFound.text')}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary">{t('notFound.home')}</Link>
        <Link to="/courses" className="btn btn-line">{t('nav.courses')}</Link>
      </div>
    </div>
  );
}
