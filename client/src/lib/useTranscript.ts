import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../redux/store';
import api from './api';
import type { GradeRecord, Plan } from './types';

const KEY = 'cc-transcript';

const readLocal = (): GradeRecord[] => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const writeLocal = (list: GradeRecord[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
  }
};

export function useTranscript() {
  const { token } = useAuth();
  const [records, setRecords] = useState<GradeRecord[] | null>(null);

  const fromPlan = (p: Plan) => setRecords(p.records);

  useEffect(() => {
    if (!token) {
      setRecords(readLocal());
      return;
    }
    api.get('/planner').then((r) => fromPlan(r.data)).catch(() => setRecords([]));
  }, [token]);

  const keepLocal = (list: GradeRecord[]) => {
    const withIds = list.map((r) => ({ ...r, _id: r._id || Math.random().toString(36).slice(2) }));
    writeLocal(withIds);
    setRecords(withIds);
  };

  const add = useCallback(
    async (r: GradeRecord) => {
      if (token) return fromPlan((await api.post('/planner/records', r)).data);
      keepLocal([...readLocal().filter((x) => !(x.code === r.code && x.semester === r.semester)), r]);
    },
    [token]
  );

  const remove = useCallback(
    async (id: string) => {
      if (token) return fromPlan((await api.delete(`/planner/records/${id}`)).data);
      keepLocal(readLocal().filter((x) => x._id !== id));
    },
    [token]
  );

  const replaceAll = useCallback(
    async (list: GradeRecord[]) => {
      if (token) return fromPlan((await api.put('/planner/records', { records: list })).data);
      keepLocal(list);
    },
    [token]
  );

  const clear = useCallback(async () => {
    if (token) return fromPlan((await api.delete('/planner/records')).data);
    keepLocal([]);
  }, [token]);

  return { records, add, remove, replaceAll, clear, saved: !!token };
}
