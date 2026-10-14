import { ArrowLeftOutlined, CheckCircleFilled, CheckOutlined, DeleteOutlined, EditOutlined, UpOutlined } from '@ant-design/icons';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import AskModal from '../components/AskModal';
import { Avatar, CodeChip, Confirm, Empty, Loading } from '../components/bits';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Answer, Thread as TThread } from '../lib/types';
import { useAuth } from '../redux/store';

function VoteButton({ votes, voted, mine, onVote }: { votes: number; voted: boolean; mine: boolean; onVote: () => void }) {
  const { t, num } = useLang();
  return (
    <button type="button" className="btn btn-line" onClick={onVote} disabled={mine} aria-pressed={voted}
      aria-label={`${t('forum.upvote')}: ${t('forum.votes', { n: votes })}`}
      style={{ flexDirection: 'column', gap: 0, minHeight: 58, width: 58, padding: 0, flexShrink: 0,
        background: voted ? 'var(--violet)' : undefined, color: voted ? 'var(--on-violet)' : undefined, borderColor: voted ? 'var(--violet)' : undefined }}>
      <UpOutlined />
      <span style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>{num(votes)}</span>
    </button>
  );
}

export default function Thread() {
  const { id = '' } = useParams();
  const { t, ago, errorText } = useLang();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState<(TThread & { answers: Answer[] }) | null>(null);
  const [missing, setMissing] = useState(false);
  const [text, setText] = useState('');
  const [editingQ, setEditingQ] = useState(false);
  const [editA, setEditA] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(() => {
    api.get(`/threads/${id}`).then((r) => setThread(r.data)).catch(() => setMissing(true));
  }, [id]);
  useEffect(load, [load]);

  if (missing) {
    return <div className="page"><Empty title={t('forum.notFound')} text={t('forum.notFoundText')} action={<Link to="/forum" className="btn btn-primary">{t('forum.back')}</Link>} /></div>;
  }
  if (!thread) return <div className="page"><Loading rows={3} /></div>;

  const need = (fn: () => void) => () => (token ? fn() : navigate('/login', { state: { from: `/forum/${id}` } }));

  const act = async (fn: () => Promise<unknown>, after?: string) => {
    try {
      await fn();
      if (after) toast.success(after);
      load();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const answer = async (e: FormEvent) => {
    e.preventDefault();
    await act(() => api.post(`/threads/${id}/answers`, { text }), t('forum.answered'));
    setText('');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <Link to="/forum" className="btn btn-quiet btn-sm" style={{ marginBottom: 14 }}><ArrowLeftOutlined /> {t('forum.back')}</Link>

      <article className="card pad" style={{ padding: 'clamp(18px, 4vw, 30px)' }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'nowrap' }}>
          <VoteButton votes={thread.votes} voted={thread.votedByMe} mine={thread.mine} onVote={need(() => act(() => api.post(`/threads/${id}/vote`)))} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row">
              <CodeChip code={thread.course.code} />
              {thread.resolved && <span className="tag lime"><CheckCircleFilled /> {t('forum.solved')}</span>}
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)', marginTop: 10 }}>{thread.title}</h1>
            <p className="row small muted" style={{ marginTop: 8 }}>
              <Avatar name={thread.author?.name} size={24} /> {thread.author?.name} · {ago(thread.createdAt)}
            </p>
            <p className="prose" style={{ marginTop: 14, whiteSpace: 'pre-line' }}>{thread.body}</p>
            {(thread.mine || isAdmin) && (
              <div className="row" style={{ marginTop: 14 }}>
                {thread.mine && <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditingQ(true)}><EditOutlined /> {t('common.edit')}</button>}
                <Confirm title={t('forum.deleteQ')} onConfirm={() => api.delete(`/threads/${id}`).then(() => navigate('/forum'))}>
                  <button type="button" className="btn btn-danger btn-sm"><DeleteOutlined /> {t('common.delete')}</button>
                </Confirm>
              </div>
            )}
          </div>
        </div>
      </article>

      <h2 style={{ fontSize: '1.3rem', margin: '26px 0 12px' }}>{t('common.answers', { n: thread.answers.length })}</h2>
      {thread.answers.length === 0 ? <p className="muted card pad">{t('forum.noAnswers')}</p> : (
        <div className="stack">
          {thread.answers.map((a) => (
            <article key={a._id} className="card pad" style={a.accepted ? { borderColor: 'var(--lime)', boxShadow: '0 0 0 2px var(--lime)' } : undefined}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'nowrap' }}>
                <VoteButton votes={a.votes} voted={a.votedByMe} mine={a.mine} onVote={need(() => act(() => api.post(`/answers/${a._id}/vote`)))} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {a.accepted && <p className="tag lime" style={{ marginBottom: 8 }}><CheckCircleFilled /> {t('forum.accepted')}</p>}
                  {editA?.id === a._id ? (
                    <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                      <label htmlFor={`ea-${a._id}`} className="sr-only">{t('common.edit')}</label>
                      <textarea id={`ea-${a._id}`} className="field" value={editA.text} onChange={(e) => setEditA({ ...editA, text: e.target.value })} />
                      <div className="row">
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => api.put(`/answers/${a._id}`, { text: editA.text })).then(() => setEditA(null))}>{t('common.save')}</button>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditA(null)}>{t('common.cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <p className="prose" style={{ whiteSpace: 'pre-line' }}>{a.text}</p>
                  )}
                  <div className="row small muted" style={{ marginTop: 10 }}>
                    <Avatar name={a.author?.name} size={24} /> {a.author?.name} · {ago(a.createdAt)}
                    <span style={{ marginLeft: 'auto' }} />
                    {thread.mine && (
                      <button type="button" className={`btn btn-sm ${a.accepted ? 'btn-line' : 'btn-lime'}`} onClick={() => act(() => api.post(`/answers/${a._id}/accept`))}>
                        <CheckOutlined /> {a.accepted ? t('forum.unaccept') : t('forum.accept')}
                      </button>
                    )}
                    {a.mine && editA?.id !== a._id && <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditA({ id: a._id, text: a.text })}><EditOutlined /> {t('common.edit')}</button>}
                    {(a.mine || isAdmin) && (
                      <Confirm title={t('forum.deleteA')} onConfirm={() => act(() => api.delete(`/answers/${a._id}`))}>
                        <button type="button" className="btn btn-danger btn-sm"><DeleteOutlined /> {t('common.delete')}</button>
                      </Confirm>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {token ? (
        <form onSubmit={answer} className="card pad stack" style={{ marginTop: 20 }}>
          <label htmlFor="answer" className="label" style={{ fontSize: '1.05rem' }}>{t('forum.answer')}</label>
          <textarea id="answer" className="field" value={text} maxLength={4000} placeholder={t('forum.answerPh')} onChange={(e) => setText(e.target.value)} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" disabled={text.trim().length < 2}>{t('forum.answer')}</button>
          </div>
        </form>
      ) : (
        <div className="card pad center" style={{ marginTop: 20 }}>
          <Link to="/login" state={{ from: `/forum/${id}` }} className="btn btn-primary">{t('forum.signIn')}</Link>
        </div>
      )}

      <AskModal open={editingQ} editing={thread} onClose={() => setEditingQ(false)} onSaved={load} />
    </div>
  );
}
