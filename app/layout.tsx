// Next.js layout: metadata/viewport exports alongside component are standard
/* eslint-disable react-refresh/only-export-components */
import type { Metadata, Viewport } from 'next';
import { Exo_2 } from 'next/font/google';
import localFont from 'next/font/local';
import '../src/styles/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { AnimationsProvider } from '@/contexts/AnimationsContext';
import { ClubProvider } from '@/contexts/ClubContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const exo2 = Exo_2({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-exo2',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

const satoshi = localFont({
  src: [
    { path: '../src/fonts/satoshi-400.woff2', weight: '400', style: 'normal' },
    { path: '../src/fonts/satoshi-500.woff2', weight: '500', style: 'normal' },
    { path: '../src/fonts/satoshi-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-satoshi',
  preload: false,
  fallback: ['system-ui', 'arial'],
});

const APP_NAME = 'Nos Joueurs en Tournoi';
const APP_TITLE = `${APP_NAME} - Suivi de tournois FFE`;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://nos-joueurs-en-tournoi.vercel.app'),
  title: {
    default: APP_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: 'Application de suivi en temps réel des tournois d\'échecs FFE. Choisissez votre club, suivez vos joueurs. Synchronisation automatique, statistiques par club, gestion multi-événements.',
  keywords: ['échecs', 'FFE', 'tournoi', 'chess', 'tracker', 'club', 'temps réel', 'statistiques', 'joueurs'],
  authors: [{ name: 'Pierre Alexandre Guillemin' }],
  creator: 'Pierre Alexandre Guillemin',
  publisher: APP_NAME,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://nos-joueurs-en-tournoi.vercel.app',
    title: APP_TITLE,
    description: 'Application de suivi en temps réel des tournois d\'échecs FFE. Choisissez votre club, suivez vos joueurs.',
    siteName: APP_NAME,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: APP_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: 'Suivi de tournois FFE en temps réel',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${exo2.variable} ${satoshi.variable}`} data-theme="miami" data-mode="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('njt-theme');var m=localStorage.getItem('njt-mode');if(t==='miami'||t==='neutral')document.documentElement.dataset.theme=t;if(m==='light'||m==='dark')document.documentElement.dataset.mode=m;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ClubProvider>
          <ThemeProvider>
            <AnimationsProvider>
              {children}
            </AnimationsProvider>
          </ThemeProvider>
        </ClubProvider>
        <Analytics />
      </body>
    </html>
  );
}
