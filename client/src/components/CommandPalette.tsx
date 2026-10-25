import { SearchOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import api from '../lib/api';
import type { Course } from '../lib/types';

let cache: Course[] | null = null;

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>(cache || []);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    setTimeout(() => input.current?.focus(), 50);
    if (!cache) {
      api.get<Course[]>('/courses').then((r) => {
        cache = r.data;
        setCourses(r.data);
      }).catch(() => {});
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/\s+/g, '');
    if (!needle) return courses.slice(0, 8);
    return courses
      .filter((c) => c.code.toLowerCase().includes(needle) || c.title.toLowerCase().replace(/\s+/g, '').includes(needle))
      .slice(0, 8);
  }, [q, courses]);

  const go = (c: Course) => {
    onClose();
    navigate(`/courses/${c.code}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active]);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} closable={false} width={560} title={null} styles={{ content: { padding: 12 } }}>
      <label htmlFor="palette" className="sr-only">{t('palette.title')}</label>
      <div style={{ position: 'relative' }}>
        <SearchOutlined style={{ position: 'absolute', left: 14, top: 15, color: 'var(--ink-2)' }} />
        <input
          id="palette"
          ref={input}
          className="field"
          style={{ paddingLeft: 40, fontSize: 17 }}
          placeholder={t('palette.placeholder')}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[active] ? `pal-${results[active].code}` : undefined}
          autoComplete="off"
        />
      </div>
      <ul id="palette-list" role="listbox" className="list-plain" style={{ marginTop: 10 }}>
        {results.length === 0 ? (
          <li className="muted center" style={{ padding: 18 }}>{t('palette.empty')}</li>
        ) : (
          results.map((c, i) => (
            <li
              key={c._id}
              id={`pal-${c.code}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(c)}
              className="link-row"
              style={{ cursor: 'pointer', background: i === active ? 'var(--sunken)' : undefined, borderTop: 0 }}
            >
              <span className="code">{c.code}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
              {i === active && <kbd>Enter</kbd>}
            </li>
          ))
        )}
      </ul>
    </Modal>
  );
}
