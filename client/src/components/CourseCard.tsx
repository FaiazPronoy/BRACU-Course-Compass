import { HeartFilled, HeartOutlined, MessageOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Course } from '../lib/types';
import { useAuth } from '../redux/store';
import { Meter, Stars } from './bits';

export default function CourseCard({ course, onSaved }: { course: Course; onSaved?: (saved: boolean) => void }) {
  const { t, num } = useLang();
  const { token } = useAuth();
  const navigate = useNavigate();
  const s = course.stats;

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!token) return navigate('/login', { state: { from: '/courses' } });
    try {
      const { data } = await api.post(`/courses/${course.code}/save`);
      toast.success(t(data.saved ? 'courses.savedToast' : 'courses.unsavedToast', { code: course.code }));
      onSaved?.(data.saved);
    } catch {
      toast.error(t('common.wentWrong'));
    }
  };

  return (
    <article className="card pad course-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <span className="code">{course.code}</span>
        <button
          type="button"
          className="icon-btn"
          onClick={toggleSave}
          aria-pressed={course.saved}
          aria-label={`${course.saved ? t('courses.unsave') : t('courses.save')}: ${course.code}`}
          style={{ color: course.saved ? 'var(--coral)' : undefined, marginRight: -8, zIndex: 1 }}
        >
          {course.saved ? <HeartFilled /> : <HeartOutlined />}
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '1.15rem' }}>
          <Link to={`/courses/${course.code}`} className="stretched">{course.title}</Link>
        </h3>
        <p className="muted small" style={{ marginTop: 4 }}>
          {course.department} · {t('common.credits', { n: course.credits })}
        </p>
      </div>
      {s.reviews > 0 ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <div className="row" style={{ gap: 8 }}>
            <Stars value={s.rating} label={`${t('courses.rating')}: ${num(s.rating, 1)} / 5`} />
            <b>{num(s.rating, 1)}</b>
            <span className="muted small">({t('common.reviews', { n: s.reviews })})</span>
          </div>
          <div className="row small muted" style={{ gap: 14 }}>
            <span className="row" style={{ gap: 6 }}>{t('courses.difficulty')} <Meter value={s.difficulty} label={t('courses.difficulty')} hot /></span>
            <span className="row" style={{ gap: 6 }}>{t('courses.workload')} <Meter value={s.workload} label={t('courses.workload')} hot /></span>
          </div>
        </div>
      ) : (
        <p className="muted small">{t('common.noRating')}</p>
      )}
      {course.threads > 0 && (
        <p className="small muted row" style={{ gap: 6 }}>
          <MessageOutlined /> {t('common.questions', { n: course.threads })}
        </p>
      )}
    </article>
  );
}
