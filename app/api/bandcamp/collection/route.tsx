import { NextRequest } from 'next/server'
import type { BandcampCollectionResponse, CachedResult, EnrichedBuyer } from '@/app/lib/shared/types'
import { crawlCollectionBuyers, enrichTopBuyers } from '@/app/lib/crawl-buyers'
import { aggregateBuyers } from '@/app/lib/buyer-utils'
import { cacheGet, cacheSet } from '@/app/lib/cache'
import { BANDCAMP_COLLECTION_URL } from '@barnemax/bandcamp-types'

async function getCollectionItems(fanId: string): Promise<BandcampCollectionResponse> {
    const res = await fetch(BANDCAMP_COLLECTION_URL, {
        body: JSON.stringify({
            count: 10000,
            fan_id: fanId,
            older_than_token: '9999999999::a::',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',

    })

    return res.json() as Promise<BandcampCollectionResponse>
}

export async function POST(request: NextRequest): Promise<Response> {
    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const fanId = body.fanId as string | undefined
    const username = (body.username as string) || ''
    const force = Boolean(body.force)

    if (!fanId || typeof fanId !== 'string') {
        return Response.json({ error: 'fanId is required' }, { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller): Promise<void> {
            const send = (data: Record<string, unknown>): void => {
                controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
            }

            try {
                // Check cache (skip if force refresh)
                const cached = force ? null : await cacheGet<CachedResult>(fanId)
                if (cached) {
                    send({
                        results: cached.results,
                        type: 'done',
                    })
                    send({
                        enrichedBuyers: cached.enrichedBuyers,
                        type: 'enriched',
                    })
                    controller.close()

                    return
                }

                send({
                    message: 'Fetching collection...',
                    type: 'status',
                })
                const collection = await getCollectionItems(fanId)
                const itemUrls = collection.items.map(i => i.item_url)

                send({
                    message: `Crawling ${itemUrls.length} items...`,
                    total: itemUrls.length,
                    type: 'status',
                })

                const results = await crawlCollectionBuyers(itemUrls, username, (completed, total) => {
                    send({
                        completed,
                        total,
                        type: 'progress',
                    })
                })

                send({
                    results,
                    type: 'done',
                })

                // Phase 2: Enrich top 25 buyers with collection counts
                const top25 = aggregateBuyers(results).slice(0, 25)
                let enrichedBuyers: EnrichedBuyer[] = []
                if (top25.length > 0) {
                    send({
                        message: `Enriching top ${top25.length} buyers...`,
                        type: 'status',
                    })
                    enrichedBuyers = await enrichTopBuyers(top25, (completed, total) => {
                        send({
                            completed,
                            total,
                            type: 'enriching',
                        })
                    })
                    send({
                        enrichedBuyers,
                        type: 'enriched',
                    })
                }

                await cacheSet(fanId, { enrichedBuyers, results }, {
                    fanId,
                    itemCount: results.length,
                    username,
                })
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                send({
                    error: message,
                    type: 'error',
                })
            } finally {
                try { controller.close() } catch { /* already closed */ }
            }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Transfer-Encoding': 'chunked',
        },
    })
}
