'use client';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProfileList } from '@/app/components/profile-list';

export default function Home(): React.JSX.Element {
  const router = useRouter();
  const [profileUrl, setProfileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bandcamp/fan-id', {
        body: JSON.stringify({ profileUrl }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      router.push(`/profiles/${data.fanId}/${encodeURIComponent(data.username)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Bandcamp Alike
          </h1>
          <p className="max-w-sm text-lg text-zinc-500 dark:text-zinc-400">
            Lookup people who have similar taste on Bandcamp
          </p>
        </div>

        <form
          className="flex w-full items-center my-16"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://bandcamp.com/yourprofile"
            className="border border-gray-300 rounded-md px-4 w-full py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer ml-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Go'}
          </button>
        </form>

        {error && <p className="text-red-500 mt-4">{error}</p>}

        <section className="w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400">Recent</h2>
            <Link
              href="/profiles"
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              View all
            </Link>
          </div>
          <ProfileList limit />
        </section>
      </main>
    </div>
  );
}
