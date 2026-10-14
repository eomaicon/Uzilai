import type { Metadata } from 'next';
import './globals.css';
import './dark-theme.css';
import {ThemeProvider} from './theme-toggle';
export const metadata: Metadata = { title: 'UZILAI | Administração interna', description: 'Painel privado do proprietário: vendas realizadas, estoque, despesas e lucro.', icons: { icon: '/uzilai-logo.png' } };
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="pt-BR" suppressHydrationWarning><body><ThemeProvider>{children}</ThemeProvider></body></html>; }
