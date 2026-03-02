'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { SortMode } from '@/app/lib/shared/types';
import { BandcampFan } from '@/app/components/bandcamp-fan';
import { generateHtmlExport, downloadHtml } from '@/app/lib/export-html';
import { useCrawl } from '@/app/hooks/use-crawl';
import { aggregateBuyers, buildBuyerTagMap, getTopTags } from '@/app/lib/buyer-utils';

export default function ResultsPage(): React.JSX.Element {
  const { fanId, username: rawUsername } = useParams<{ fanId: string; username: string }>();
  const username = decodeURIComponent(rawUsername);

  const { status, results, enrichedBuyers, error, startCrawl } = useCrawl(fanId, username);

  useEffect(() => { document.title = `${username} | Bandcamp Alike` }, [username]);

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('percentage');

  const progress =
    status?.completed && status?.total
      ? Math.round((status.completed / status.total) * 100)
      : null;

  const allBuyers = useMemo(
    () => (results ? aggregateBuyers(results) : []),
    [results]
  );

  const topBuyers = useMemo(() => allBuyers.slice(0, 25), [allBuyers]);

  const topBuyerUrls = useMemo(
    () => new Set(topBuyers.map(({ buyer }) => buyer.url)),
    [topBuyers]
  );

  // Only consider items where at least one top 25 buyer appears
  const topBuyerResults = useMemo(
    () => results?.filter(item => item.buyers.some(b => topBuyerUrls.has(b.url))) ?? [],
    [results, topBuyerUrls]
  );

  const buyerTagMap = useMemo(
    () => buildBuyerTagMap(topBuyerResults),
    [topBuyerResults]
  );

  const topTags = useMemo(
    () => getTopTags(topBuyerResults, 15),
    [topBuyerResults]
  );

  // Index enriched buyers by URL for fast lookup
  const enrichedMap = useMemo(() => {
    if (!enrichedBuyers) return new Map()

    return new Map(enrichedBuyers.map((eb) => [eb.buyer.url, eb]))
  }, [enrichedBuyers]);

  // Unified sorted + filtered buyer list
  const displayBuyers = useMemo(() => {
    let list = topBuyers;

    if (selectedTags.size > 0) {
      list = list.filter(({ buyer }) => {
        const tags = buyerTagMap.get(buyer.url);
        if (!tags) return false;
        for (const t of selectedTags) {
          if (tags.has(t)) return true;
        }

        return false;
      });
    }

    if (sortMode === 'percentage' && enrichedBuyers) {
      return [...list].sort((a, b) => {
        const aPct = enrichedMap.get(a.buyer.url)?.percentage ?? 0;
        const bPct = enrichedMap.get(b.buyer.url)?.percentage ?? 0;

        return bPct - aPct || b.count - a.count;
      });
    }

    return list;
  }, [topBuyers, selectedTags, sortMode, enrichedBuyers, enrichedMap, buyerTagMap]);

  const errorCount = results?.filter((r) => r.error).length ?? 0;

  function toggleTag(tag: string): void {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }

      return next;
    });
  }

  function handleExport(): void {
    if (!results) return;
    const name = username || fanId;
    const buyers = topBuyers.map(({ buyer, count }) => ({
      buyer,
      count,
      tags: Array.from(buyerTagMap.get(buyer.url) ?? []).slice(0, 10),
    }));
    const html = generateHtmlExport({
      buyers,
      enrichedBuyers: enrichedBuyers ?? [],
      itemCount: results.length,
      name,
    });
    downloadHtml(html, `bandcamp-alike-${name}.html`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col gap-8 py-16 px-16 bg-white dark:bg-black">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Results for {username || fanId}
            </h1>
            <Link
              href="/profiles/"
              className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Back
            </Link>
          </div>

          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {topTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${selectedTags.has(tag)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-blue-300'
                    }`}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.size > 0 && (
                <button
                  onClick={() => setSelectedTags(new Set())}
                  className="text-xs px-2.5 py-1 cursor-pointer rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-red-500">{error}</p>}

        {status && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <p>{status.message}</p>
            {progress !== null && (
              <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {status.completed != null && status.total != null && (
              <p className="mt-1">
                {status.completed} / {status.total}
              </p>
            )}
          </div>
        )}

        {results && (
          <>
            <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
              <span>
                {results.length} items crawled
                {errorCount > 0 && ` (${errorCount} errors)`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => startCrawl(true)}
                  className="text-sm px-3 py-1 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-300 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={handleExport}
                  className="text-sm px-3 py-1 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-300 transition-colors"
                >
                  Export HTML
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSortMode('count')}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${sortMode === 'count'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black border-transparent'
                  : 'text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                  }`}
              >
                Most items shared
              </button>
              <button
                onClick={() => setSortMode('percentage')}
                disabled={!enrichedBuyers}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${sortMode === 'percentage'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black border-transparent'
                  : 'text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                  } ${!enrichedBuyers ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                Most % shared
              </button>
            </div>

            <section>
              <div className="grid gap-3">
                {displayBuyers.map(({ buyer, count }, i) => {
                  const enriched = enrichedMap.get(buyer.url);

                  return (
                    <BandcampFan
                      key={buyer.url}
                      buyer={buyer}
                      rank={i + 1}
                      tags={Array.from(buyerTagMap.get(buyer.url) ?? []).slice(0, 10)}
                      display={
                        sortMode === 'percentage' && enriched
                          ? {
                            mode: 'percentage',
                            percentage: enriched.percentage,
                            sharedCount: enriched.sharedCount,
                            totalCollection: enriched.totalCollection,
                          }
                          : { count, mode: 'count' }
                      }
                    />
                  );
                })}
              </div>

              {selectedTags.size > 0 && displayBuyers.length === 0 && (
                <p className="text-sm text-zinc-400 mt-4">
                  No buyers match the selected tags.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
