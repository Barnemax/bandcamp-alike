'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { CrawlItemResult, EnrichedBuyer, StreamStatus } from '@/app/lib/shared/types'

interface UseCrawlResult {
    status: StreamStatus | null
    results: CrawlItemResult[] | null
    enrichedBuyers: EnrichedBuyer[] | null
    error: string | null
    startCrawl: (force?: boolean) => void
}

export function useCrawl(fanId: string, username: string): UseCrawlResult {
    const [status, setStatus] = useState<StreamStatus | null>({ message: 'Starting...' })
    const [results, setResults] = useState<CrawlItemResult[] | null>(null)
    const [enrichedBuyers, setEnrichedBuyers] = useState<EnrichedBuyer[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    const controllerRef = useRef<AbortController | null>(null)

    const startCrawl = useCallback(async (force = false) => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller

        setStatus({ message: 'Starting...' })
        setResults(null)
        setEnrichedBuyers(null)
        setError(null)

        try {
            const res = await fetch('/api/bandcamp/collection', {
                body: JSON.stringify({ fanId, force, username }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                signal: controller.signal,
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Something went wrong')
            }

            const reader = res.body?.getReader()
            if (!reader) throw new Error('No response stream')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.trim()) continue
                    const msg = JSON.parse(line)

                    switch (msg.type) {
                        case 'status':
                            setStatus({ message: msg.message, total: msg.total })
                            break
                        case 'progress':
                            setStatus((prev) => ({
                                completed: msg.completed,
                                message: prev?.message ?? 'Crawling...',
                                total: msg.total,
                            }))
                            break
                        case 'done':
                            setResults(msg.results)
                            setStatus(null)
                            break
                        case 'enriching':
                            setStatus({
                                completed: msg.completed,
                                message: 'Enriching top buyers...',
                                total: msg.total,
                            })
                            break
                        case 'enriched':
                            setEnrichedBuyers(msg.enrichedBuyers)
                            setStatus(null)
                            break
                        case 'error':
                            throw new Error(msg.error)
                    }
                }
            }
        } catch (err: unknown) {
            if (controller.signal.aborted) return
            setError(err instanceof Error ? err.message : String(err))
            setStatus(null)
        }
    }, [fanId, username])

    useEffect(() => {
        startCrawl()

        return () => controllerRef.current?.abort()
    }, [startCrawl])

    return { enrichedBuyers, error, results, startCrawl, status }
}
