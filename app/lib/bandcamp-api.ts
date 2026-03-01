import { parse } from 'node-html-parser'
import pLimit from 'p-limit'
import type { BandcampBuyer, CollectorsBlob, TralbumType } from '@/app/lib/shared/types'
import { decodeHtmlEntities, parsePageDataBlob } from '@/app/lib/shared/utils'
import { BANDCAMP_COLLECTORS_URL } from '@barnemax/bandcamp-types'

const TIMEOUT_MS = 20000
const MAX_RETRIES = 2
const MAX_429_RETRIES = 6
const RETRY_DELAY_MS = 5000
const COLLECTORS_API_DELAY_MS = 1000

// Serialize collectors API calls to avoid concurrent 429s
const collectorsLimit = pLimit(1)

const ITEM_TYPE_MAP: Record<string, TralbumType> = {
    a: 'a',
    album: 'a',
    t: 't',
    track: 't',
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// --- HTML parsing ---

export function parseCollectorsBlob(html: string): CollectorsBlob | null {
    const root = parse(html)
    const el = root.querySelector('#collectors-data')
    if (!el) return null

    try {
        const raw = el.getAttribute('data-blob')
        if (!raw) return null
        return JSON.parse(decodeHtmlEntities(raw)) as CollectorsBlob
    } catch {
        return null
    }
}

export function extractTrablumInfo(html: string): { id: number, type: TralbumType } | null {
    const match = html.match(/data-tralbum=["']([^"']+)["']/)
    if (!match) return null

    try {
        const data = JSON.parse(decodeHtmlEntities(match[1]))
        const type = ITEM_TYPE_MAP[data.item_type]
        if (type && data.id) return { id: data.id, type }
    } catch { /* ignore */ }

    return null
}

export function extractTags(html: string): string[] {
    const root = parse(html)
    return root.querySelectorAll('.tralbum-tags .tag')
        .map(el => el.text.trim())
        .filter(Boolean)
}

export function thumbsToBuyers(thumbs: CollectorsBlob['thumbs']): BandcampBuyer[] {
    return thumbs
        .filter(t => t.username)
        .map(t => ({
            image: t.image_id ? `https://f4.bcbits.com/img/${t.image_id}_3.jpg` : null,
            name: t.name || t.username,
            url: `https://bandcamp.com/${t.username}`,
        }))
}

// --- HTTP fetching ---

export async function fetchHtml(url: string): Promise<string> {
    let rateLimitHits = 0

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        try {
            const res = await fetch(url, {
                headers: {
                    'Accept': 'text/html',
                    'User-Agent': 'Mozilla/5.0 (compatible; BandcampMatch/1.0)',
                },
                signal: controller.signal,
            })
            clearTimeout(timeoutId)

            if (res.status === 429) {
                rateLimitHits++
                if (rateLimitHits > MAX_429_RETRIES) throw new Error('Rate limited')
                const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10')
                await sleep(retryAfter * 1000)
                attempt-- // 429s don't count as a real attempt
                continue
            }

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }

            return await res.text()
        } catch (err) {
            clearTimeout(timeoutId)
            if (attempt === MAX_RETRIES) throw err
            await sleep(RETRY_DELAY_MS * (attempt + 1))
        }
    }
    throw new Error('Max retries exceeded')
}

export async function fetchAllBuyers(html: string): Promise<BandcampBuyer[]> {
    const collectors = parseCollectorsBlob(html)

    // No more buyers available — use what's in the blob (or empty)
    if (!collectors?.more_thumbs_available) {
        return collectors ? thumbsToBuyers(collectors.thumbs) : []
    }

    const info = extractTrablumInfo(html)
    if (!info) {
        return thumbsToBuyers(collectors.thumbs)
    }

    // Serialize API calls — only one at a time to avoid 429 storms
    const apiResult = await collectorsLimit(async () => {
        await sleep(COLLECTORS_API_DELAY_MS)

        let res: Response | null = null
        for (let attempt = 0; attempt < 3; attempt++) {
            res = await fetch(BANDCAMP_COLLECTORS_URL, {
                body: JSON.stringify({
                    count: 2500,
                    token: '1:0',
                    tralbum_id: info.id,
                    tralbum_type: info.type,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            })

            if (res.status !== 429) break

            const retryAfter = parseInt(res.headers.get('Retry-After') ?? '15')
            await sleep(retryAfter * 1000)
        }

        return res
    })

    if (!apiResult?.ok) {
        return thumbsToBuyers(collectors.thumbs)
    }

    const data = await apiResult.json()
    const thumbs = data.results ?? []

    if (thumbs.length === 0) return thumbsToBuyers(collectors.thumbs)

    return thumbs
        .filter((thumb: Record<string, unknown>) => thumb.username && thumb.url)
        .map((thumb: Record<string, unknown>) => ({
            image: thumb.image_id ? `https://f4.bcbits.com/img/${thumb.image_id}_3.jpg` : null,
            name: (thumb.name || thumb.username) as string,
            url: thumb.url as string,
        }))
}

export async function fetchCollectionCount(profileUrl: string): Promise<number | null> {
    try {
        const html = await fetchHtml(profileUrl)
        const blob = parsePageDataBlob(html)
        if (!blob) return null

        return (blob.collection_count as number) ?? null
    } catch {
        return null
    }
}
