'use client';
import {ThemeProvider as NextThemeProvider, useTheme} from 'next-themes';
import {Moon, Sun} from 'lucide-react';
import {useEffect, useState, type ReactNode} from 'react';

export function ThemeProvider({children}: {children: ReactNode}) {
  return <NextThemeProvider attribute="data-theme" storageKey="uzilai-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange>{children}</NextThemeProvider>;
}

export function ThemeToggle() {
  const {theme, setTheme} = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && theme === 'dark';
  const label = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
  return <button type="button" className="theme-toggle" aria-label={label} title={label} aria-pressed={dark} disabled={!mounted} onClick={() => setTheme(dark ? 'light' : 'dark')}>
    {dark ? <Sun size={17}/> : <Moon size={17}/>}
    <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
  </button>;
}
