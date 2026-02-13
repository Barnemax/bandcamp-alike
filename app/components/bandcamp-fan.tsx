import type React from 'react';
import Image from 'next/image';
import type { BandcampBuyer } from '@/app/lib/shared/types';

interface BandcampFanProps {
    buyer: BandcampBuyer;
    rank: number;
    tags?: string[];
    /** "count" mode: show shared count. "percentage" mode: show % of collection. */
    display:
    | { mode: 'count'; count: number }
    | { mode: 'percentage'; percentage: number; sharedCount: number; totalCollection: number };
}

export function BandcampFan({ buyer, rank, tags, display }: BandcampFanProps): React.JSX.Element {
    return (
        <a
            href={buyer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-2 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
            <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-zinc-400 w-6">{rank}</span>
                {buyer.image && (
                    <Image
                        src={buyer.image}
                        alt={buyer.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                )}
                <span className="text-black dark:text-zinc-100 font-medium">
                    {buyer.name}
                </span>
                <span className="ml-auto text-sm text-zinc-500 text-right">
                    {display.mode === 'count' ? (
                        <>{display.count} shared</>
                    ) : (
                        <>
                            {display.percentage}%
                            <span className="text-zinc-400 ml-1">
                                ({display.sharedCount}/{display.totalCollection})
                            </span>
                        </>
                    )}
                </span>
            </div>
            {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-9">
                    {tags.slice(0, 10).map((tag) => (
                        <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                            {tag}
                        </span>
                    ))}
                    {tags.length > 10 && (
                        <span className="text-xs text-zinc-400">
                            +{tags.length - 10} more
                        </span>
                    )}
                </div>
            )}
        </a>
    );
}
