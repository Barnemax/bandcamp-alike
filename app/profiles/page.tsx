'use client';

import type React from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import { ProfileList } from '@/app/components/profile-list';

export default function ProfilesPage(): React.JSX.Element {
  useEffect(() => { document.title = 'Profiles | Bandcamp Alike' }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col gap-8 py-16 px-16 bg-white dark:bg-black">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Cached profiles
          </h1>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Back
          </Link>
        </div>

        <ProfileList className="grid-cols-2" />
      </main>
    </div>
  );
}
