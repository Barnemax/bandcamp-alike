import pLimit from 'p-limit'
import type { BandcampBuyer, BuyerCount, CrawlItemResult, EnrichedBuyer } from '@/app/lib/shared/types'
import { extractTags, fetchAllBuyers, fetchCollectionCount, fetchHtml, sleep } from '@/app/lib/bandcamp-api'

const MAX_CONCURRENT = 4
const REQUEST_DELAY_MS = 2500
const RETRY_QUEUE_DELAY_MS = 5000

function filterBuyers(buyers: BandcampBuyer[], excludeUsername?: string): BandcampBuyer[] {
    if (!excludeUsername) return buyers
    return buyers.filter(b => !b.url.includes(`/${excludeUsername}`))
}

async function crawlItem(url: string, excludeUsername?: string): Promise<CrawlItemResult> {
    const html = await fetchHtml(url)
    const allBuyers = await fetchAllBuyers(html)
    const buyers = filterBuyers(allBuyers, excludeUsername)
    const tags = extractTags(html)

    return { buyers, tags, url }
}

export async function crawlCollectionBuyers(
    urls: string[],
    excludeUsername?: string,
    onProgress?: (completed: number, total: number) => void,
): Promise<CrawlItemResult[]> {
    const limit = pLimit(MAX_CONCURRENT)
    let completed = 0

    const tasks = urls.map((url) =>
        limit(async (): Promise<CrawlItemResult> => {
            try {
                await sleep(REQUEST_DELAY_MS)
                return await crawlItem(url, excludeUsername)
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                return { buyers: [], error: message, tags: [], url }
            } finally {
                completed++
                onProgress?.(completed, urls.length)
            }
        })
    )

    const results = await Promise.all(tasks)

    // Retry failed items sequentially with longer delay
    const failed = results.filter(r => r.error)
    if (failed.length > 0) {
        for (const item of failed) {
            try {
                await sleep(RETRY_QUEUE_DELAY_MS)
                const retried = await crawlItem(item.url, excludeUsername)
                item.buyers = retried.buyers
                item.tags = retried.tags
                delete item.error
            } catch {
                // Keep original error
            }
        }
    }

    return results
}

export async function enrichTopBuyers(
    topBuyers: BuyerCount[],
    onProgress?: (completed: number, total: number) => void,
): Promise<EnrichedBuyer[]> {
    const limit = pLimit(5)
    let completed = 0

    const tasks = topBuyers.map(({ buyer, count }) =>
        limit(async (): Promise<EnrichedBuyer> => {
            const totalCollection = await fetchCollectionCount(buyer.url)
            const percentage = totalCollection
                ? Math.round((count / totalCollection) * 10000) / 100
                : 0

            completed++
            onProgress?.(completed, topBuyers.length)

            return { buyer, percentage, sharedCount: count, totalCollection: totalCollection ?? 0 }
        })
    )

    const results = await Promise.all(tasks)
    return results.sort((a, b) => b.percentage - a.percentage)
}
