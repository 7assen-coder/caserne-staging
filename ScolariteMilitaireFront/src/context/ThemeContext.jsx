import { useEffect, useLayoutEffect, useMemo } from 'react';
import { ThemeContext } from './themeStore';

function applyLightDocument() {
  const el = document.documentElement;
  el.classList.remove('dark');
  el.setAttribute('data-theme', 'light');
}

export function ThemeProvider({ children }) {
  useLayoutEffect(() => {
    applyLightDocument();
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#ffffff');
  }, []);

  const value = useMemo(() => ({ theme: 'light' }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
