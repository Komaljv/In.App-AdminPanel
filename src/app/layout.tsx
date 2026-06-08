import type { Metadata, Viewport } from 'next';
import { APP_CONFIG } from '@/config/app.config';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name,
    template: `%s — ${APP_CONFIG.name}`,
  },
  description: 'Admin panel for managing users, roles, and invitations.',
  robots: { index: false, follow: false }, // private admin panel
  icons: {
    icon: '/brand/logo-icon.svg',
    shortcut: '/brand/logo-icon.svg',
    apple: '/brand/logo-icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
