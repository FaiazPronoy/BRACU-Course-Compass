import { ConfigProvider, theme as antdTheme } from 'antd';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeValue {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue>({ dark: false, toggle: () => {} });

const startDark = () => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
  } catch {
    /* private mode */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

// Ant Design paints its own blue on every button, picker and modal unless it
// is told otherwise. These are the same colours as the variables in index.css.
const tokens = (dark: boolean) => ({
  algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: dark ? '#C99BFF' : '#7A22C9',
    colorInfo: dark ? '#C99BFF' : '#7A22C9',
    colorSuccess: dark ? '#9FD33A' : '#3E7A00',
    colorWarning: dark ? '#F2C46B' : '#8A5A00',
    colorError: dark ? '#FF8F86' : '#AD2A25',
    colorBgBase: dark ? '#100A1C' : '#F4ECFF',
    colorBgContainer: dark ? '#19112B' : '#FFFFFF',
    colorBgElevated: dark ? '#221838' : '#FFFFFF',
    colorTextBase: dark ? '#F2EBFB' : '#1D0F33',
    colorBorder: dark ? '#4A3570' : '#CFB8EF',
    colorBorderSecondary: dark ? '#33254F' : '#E6D8F8',
    // antd's own placeholder grey is far too faint to read
    colorTextPlaceholder: dark ? '#9C95BD' : '#6A6485',
    borderRadius: 12,
    controlHeight: 44,
    fontFamily: "'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', 'Anek Bangla', system-ui, sans-serif",
    fontSize: 15,
  },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(startDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#100A1C' : '#7A22C9');
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* private mode */
    }
  }, [dark]);

  const value = useMemo(() => ({ dark, toggle: () => setDark((d) => !d) }), [dark]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={tokens(dark)}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
