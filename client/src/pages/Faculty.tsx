import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Avatar, Empty, Loading, Meter, PageHead, Stars } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Review } from '../lib/types';

interface FacultyData {
  initials: string;
  reviews: number;
  rating: number;
  difficulty: number;
  workload: number;
  courses: { code: string; title: string; reviews: number }[];
  recent: Review[];
}

export default function Faculty() {
  const { initials = '' } = useParams();
  const { t, num, ago } = useLang();
  const [data, setData] = useState<FacultyData | null | false>(null);

  useEffect(() => {
    setData(null);
    api.get(`/faculty/${initials}`).then((r) => setData(r.data)).catch(() => setData(false));
  }, [initials]);

  if (data === null) return <div className="page"><Loading /></div>;
  if (data === false) {
    return (
      <div className="page">
        <Empty title={t('faculty.none', { initials: initials.toUpperCase() })} text={t('faculty.noneText')}
          action={<Link to="/courses" className="btn btn-line">{t('landing.browse')}</Link>} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHead title={data.initials} lead={t('faculty.lead', { n: data.reviews })} />

      <div className="faculty-sum card pad">
        <div>
          <span className="muted small">{t('courses.rating')}</span>
          <div className="row" style={{ gap: 8 }}><Stars value={data.rating} /><b>{num(data.rating, 1)} / 5</b></div>
        </div>
        <div>
          <span className="muted small">{t('courses.difficulty')}</span>
          <div className="row" style={{ gap: 8 }}><Meter value={data.difficulty} label={t('courses.difficulty')} hot /><b>{num(data.difficulty, 1)} / 5</b></div>
        </div>
        <div>
          <span className="muted small">{t('courses.workload')}</span>
          <div className="row" style={{ gap: 8 }}><Meter value={data.workload} label={t('courses.workload')} hot /><b>{num(data.workload, 1)} / 5</b></div>
        </div>
      </div>
      <p className="muted small" style={{ margin: '10px 0 28px' }}>{t('faculty.note')}</p>

      <h2 style={{ fontSize: '1.3rem', marginBottom: 10 }}>{t('faculty.courses')}</h2>
      <table className="plain-table">
        <tbody>
          {data.courses.map((c) => (
            <tr key={c.code}>
              <th scope="row"><Link to={`/courses/${c.code}`} className="code">{c.code}</Link></th>
              <td>{c.title}</td>
              <td className="muted small" style={{ textAlign: 'right' }}>{t('common.reviews', { n: c.reviews })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: '1.3rem', margin: '28px 0 10px' }}>{t('faculty.recent')}</h2>
      <div className="grid grid-2">
        {data.recent.map((r) => (
          <article key={r._id} className="card pad" style={{ display: 'grid', gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="tag opinion">{t('review.opinion')}</span>
              <Stars value={r.rating} />
            </div>
            <p className="prose">{r.body}</p>
            <div className="row small muted">
              <Avatar name={r.author?.name} size={26} />
              <span>{r.author?.name}</span>
              <span>{r.semester}</span>
              <span>{ago(r.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
