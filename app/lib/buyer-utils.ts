import type { BuyerCount, CrawlItemResult } from '@/app/lib/shared/types'

export function aggregateBuyers(results: CrawlItemResult[]): BuyerCount[] {
    const map = new Map<string, BuyerCount>()

    for (const item of results) {
        for (const buyer of item.buyers) {
            const existing = map.get(buyer.url)
            if (existing) {
                existing.count++
            } else {
                map.set(buyer.url, { buyer, count: 1 })
            }
        }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

// Build a map: buyerUrl -> Set<tag> (unique tags from items they appear in)
export function buildBuyerTagMap(results: CrawlItemResult[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>()

    for (const item of results) {
        if (item.tags.length === 0) continue
        for (const buyer of item.buyers) {
            let tags = map.get(buyer.url)
            if (!tags) {
                tags = new Set()
                map.set(buyer.url, tags)
            }
            for (const tag of item.tags) {
                tags.add(tag)
            }
        }
    }

    return map
}

// Get top N tags across all crawled items, sorted by frequency
export function getTopTags(results: CrawlItemResult[], limit: number): string[] {
    const counts = new Map<string, number>()

    for (const item of results) {
        for (const tag of item.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1)
        }
    }

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag]) => tag)
}
