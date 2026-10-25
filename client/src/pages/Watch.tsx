import { ArrowLeftOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Empty, Loading } from '../components/bits';
import NoteEditor from '../components/NoteEditor';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { CourseDetail, Note } from '../lib/types';
import { useAuth } from '../redux/store';

export default function Watch() {
  const { t, errorText } = useLang();
  const { token } = useAuth();
  const [params] = useSearchParams();
  const code = (params.get('course') || '').toUpperCase();
  const list = /^[\w-]{10,64}$/.test(params.get('list') || '') ? params.get('list')! : '';
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const playlistUrl = `https://www.youtube.com/playlist?list=${list}`;
  const playlist = course?.playlists.find((p) => p.url.includes(list));

  useEffect(() => {
    if (code) api.get(`/courses/${code}`).then((r) => setCourse(r.data)).catch(() => {});
  }, [code]);

  const loadNotes = useCallback(() => {
    if (!token || !code) return;
    api.get(`/notes?course=${code}`).then((r) => {
      const here = (r.data as Note[]).filter((n) => n.playlist.includes(list));
      setNotes(here);
      setOpenId((id) => id || here[0]?._id || null);
    }).catch(() => setNotes([]));
  }, [token, code, list]);
  useEffect(loadNotes, [loadNotes]);

  const newNote = async () => {
    try {
      const { data } = await api.post('/notes', { title: playlist?.title || t('notes.untitled'), content: '', course: code, playlist: playlistUrl });
      setNotes((n) => [data, ...(n || [])]);
      setOpenId(data._id);
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  if (!list) {
    return <div className="page"><Empty title={t('watch.notFound')} text={t('watch.notFoundText')} action={code ? <Link to={`/courses/${code}?tab=resources`} className="btn btn-primary">{t('watch.back', { code })}</Link> : undefined} /></div>;
  }

  const current = notes?.find((n) => n._id === openId);

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <div className="row" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
        <Link to={`/courses/${code}?tab=resources`} className="btn btn-quiet btn-sm"><ArrowLeftOutlined /> {t('watch.back', { code })}</Link>
        {playlist && <p style={{ fontWeight: 700 }}><span className="code">{code}</span> {playlist.title}</p>}
      </div>
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', alignItems: 'start' }}>
        <div className="card" style={{ overflow: 'hidden', position: 'sticky', top: 90 }}>
          <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/videoseries?list=${list}`}
              title={playlist?.title || 'YouTube playlist'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </div>
        </div>

        <section className="card pad" aria-labelledby="watch-notes">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 id="watch-notes" style={{ fontSize: '1.2rem' }}><FileTextOutlined /> {t('watch.notesFor')}</h2>
            {token && <button type="button" className="btn btn-line btn-sm" onClick={newNote}><PlusOutlined /> {t('watch.newNote')}</button>}
          </div>
          {!token ? (
            <Link to="/login" state={{ from: `/watch?course=${code}&list=${list}` }} className="btn btn-primary">{t('common.signInToDo')}</Link>
          ) : notes === null ? <Loading rows={2} /> : !current ? (
            <div className="center" style={{ padding: 24 }}>
              <p className="muted">{t('watch.yourNotes')}</p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={newNote}><PlusOutlined /> {t('watch.newNote')}</button>
            </div>
          ) : (
            <>
              {notes.length > 1 && (
                <div className="chips" style={{ marginBottom: 12 }}>
                  {notes.map((n) => <button key={n._id} type="button" className="chip" aria-pressed={n._id === openId} onClick={() => setOpenId(n._id)}>{n.title}</button>)}
                </div>
              )}
              <NoteEditor note={current} compact
                onSaved={(n) => setNotes((l) => l!.map((x) => (x._id === n._id ? { ...x, title: n.title } : x)))}
                onDeleted={() => { setOpenId(null); loadNotes(); }} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
