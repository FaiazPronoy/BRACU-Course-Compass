import dayjs from 'dayjs';
import 'dayjs/locale/bn';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bn from './bn';
import en from './en';

type Lang = 'en' | 'bn';
type Vars = Record<string, string | number>;

const dicts: Record<Lang, unknown> = { en, bn };

const lookup = (dict: unknown, key: string): string | undefined => {
  const v = key.split('.').reduce<unknown>(
    (o, k) => (o != null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
    dict,
  );
  return typeof v === 'string' ? v : undefined;
};

interface LangValue {
  lang: Lang;
  toggle: () => void;
  t: (key: string, vars?: Vars) => string;
  num: (n: number, digits?: number) => string;
  date: (d: string | Date, format?: string) => string;
  ago: (d: string | Date) => string;
  errorText: (err: unknown, fallbackKey?: string) => string;
}

const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem('lang') === 'bn' ? 'bn' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lookup(dicts[lang], 'common.pageTitle') || document.title;
    dayjs.locale(lang === 'bn' ? 'bn' : 'en');
    try {
      localStorage.setItem('lang', lang);
    } catch {
    }
  }, [lang]);

  const num = useCallback(
    (n: number, digits = 0) =>
      Number(n || 0).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    [lang]
  );

  const t = useCallback(
    (key: string, vars?: Vars) => {
      let text: string | undefined;
      if (vars && vars.n === 1) text = lookup(dicts[lang], key + '_one');
      text ??= lookup(dicts[lang], key) ?? lookup(en, key) ?? key;
      if (!vars) return text;
      return text.replace(/\{(\w+)\}/g, (_, k) => {
        const v = vars[k];
        return typeof v === 'number' ? num(v) : v ?? '';
      });
    },
    [lang, num]
  );

  const date = useCallback((d: string | Date, format = 'D MMM YYYY') => dayjs(d).locale(lang).format(format), [lang]);

  const ago = useCallback(
    (d: string | Date) => {
      const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const days = Math.floor(h / 24);
      if (s < 60) return t('time.now');
      if (m < 60) return t('time.min', { n: m });
      if (h < 24) return t('time.hr', { n: h });
      if (days < 30) return t('time.day', { n: days });
      return date(d);
    },
    [t, date]
  );

  const errorText = useCallback(
    (err: unknown, fallbackKey = 'common.wentWrong') => {
      const said = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (lang === 'en') return said || t(fallbackKey);
      return (said && bn.server[said]) || t(fallbackKey);
    },
    [lang, t]
  );

  const value = useMemo(
    () => ({ lang, toggle: () => setLang((l) => (l === 'en' ? 'bn' : 'en')), t, num, date, ago, errorText }),
    [lang, t, num, date, ago, errorText]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang outside LangProvider');
  return ctx;
};
