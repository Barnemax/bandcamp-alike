'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CachedProfile } from '@/app/lib/shared/types';
import { timeAgo } from '@/app/lib/shared/utils';

interface ProfileListProps {
  limit?: boolean;
  className?: string;
}

export function ProfileList({ limit, className = 'grid-cols-1' }: ProfileListProps): React.JSX.Element | null {
  const [profiles, setProfiles] = useState<CachedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const url = limit
      ? '/api/bandcamp/cached-profiles'
      : '/api/bandcamp/cached-profiles?all=1';
    fetch(url)
      .then(r => r.json())
      .then(setProfiles)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [limit]);

  function handleDelete(e: React.MouseEvent, fanId: string): void {
    e.preventDefault();
    fetch(`/api/bandcamp/cached-profiles?fanId=${fanId}`, { method: 'DELETE' })
      .then(() => setProfiles(prev => prev.filter(p => p.fanId !== fanId)))
      .catch(() => { });
  }

  if (loading) return <p className="text-sm text-zinc-400">Loading...</p>;
  if (fetchError) return <p className="text-sm text-zinc-400">Failed to load profiles.</p>;
  if (profiles.length === 0) return null;

  return (
    <div className={`grid gap-1 ${className}`}>
      {profiles.map((p) => (
        <Link
          key={p.fanId}
          href={`/profiles/${p.fanId}/${encodeURIComponent(p.username)}`}
          className="group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <span className="text-black dark:text-zinc-100 font-medium">
            {p.username || p.fanId}
          </span>
          <span className="flex items-center gap-2 text-xs text-zinc-400">
            {p.itemCount} items &middot; {timeAgo(p.cachedAt)}
            <button
              onClick={(e) => handleDelete(e, p.fanId)}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Remove"
            >
              ✕
            </button>
          </span>
        </Link>
      ))}
    </div>
  );
}
