import type React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  description: 'Find people with similar music taste by analyzing your Bandcamp collection',
  title: 'Bandcamp Alike',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <footer className="w-full py-6 text-center text-xs text-zinc-400">
          <div className="container max-w-3xl px-4 mx-auto">
            Provided by <Link target="_blank" href="https://barnemax.com" className="underline hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">barnemax</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
