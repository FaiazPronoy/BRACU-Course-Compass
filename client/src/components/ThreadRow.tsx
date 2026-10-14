import { CheckCircleFilled, MessageOutlined, UpOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import type { Thread } from '../lib/types';

export default function ThreadRow({ thread, showCourse = true }: { thread: Thread; showCourse?: boolean }) {
  const { t, num, ago } = useLang();
  return (
    <li>
      <Link to={`/forum/${thread._id}`} className="link-row" style={{ alignItems: 'flex-start', padding: '14px 8px', gap: 14 }}>
        <span className="center" style={{ width: 52, flexShrink: 0, paddingTop: 2 }} aria-label={t('forum.votes', { n: thread.votes })}>
          <UpOutlined style={{ color: thread.votedByMe ? 'var(--violet)' : 'var(--ink-2)', fontSize: 12 }} />
          <b style={{ display: 'block', fontFamily: 'var(--display)', fontSize: '1.2rem', lineHeight: 1.2 }}>{num(thread.votes)}</b>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.35 }}>{thread.title}</span>
          <span className="row small muted" style={{ marginTop: 6, gap: 8 }}>
            {showCourse && thread.course && <span className="code">{thread.course.code}</span>}
            {thread.resolved && <span className="tag lime"><CheckCircleFilled /> {t('forum.solved')}</span>}
            <span className="row" style={{ gap: 5 }}><MessageOutlined /> {t('common.answers', { n: thread.answerCount })}</span>
            <span>{thread.author?.name} · {ago(thread.createdAt)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
