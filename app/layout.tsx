/* eslint-disable react-refresh/only-export-components */
import type { Metadata, Viewport } from 'next';
import { Audiowide, Inter } from 'next/font/google';
import '../src/styles/globals.css';
import { AnimationsProvider } from '@/contexts/AnimationsContext';

const audiowide = Audiowide({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-audiowide',
  preload: true,
  fallback: ['cursive', 'system-ui'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://nos-joueurs-en-tournoi.vercel.app'),
  title: {
    default: 'Nos Joueurs en Tournoi - Suivi de tournois FFE',
    template: '%s | Nos Joueurs en Tournoi',
  },
  description: 'Application de suivi en temps réel des tournois d\'échecs FFE. Choisissez votre club, suivez vos joueurs. Synchronisation automatique, statistiques par club, gestion multi-événements.',
  keywords: ['échecs', 'FFE', 'tournoi', 'chess', 'tracker', 'club', 'temps réel', 'statistiques', 'joueurs'],
  authors: [{ name: 'Pierre Alexandre Guillemin' }],
  creator: 'Pierre Alexandre Guillemin',
  publisher: 'Nos Joueurs en Tournoi',
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
    title: 'Nos Joueurs en Tournoi - Suivi de tournois FFE',
    description: 'Application de suivi en temps réel des tournois d\'échecs FFE. Choisissez votre club, suivez vos joueurs.',
    siteName: 'Nos Joueurs en Tournoi',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nos Joueurs en Tournoi - Suivi de tournois FFE',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nos Joueurs en Tournoi',
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
    <html lang="fr" className={`${inter.variable} ${audiowide.variable}`}>
      <body className={inter.className}>
        <AnimationsProvider>
          {children}
        </AnimationsProvider>
      </body>
    </html>
  );
}
