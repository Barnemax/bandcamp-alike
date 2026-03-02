import { describe, it, expect } from 'vitest'
import { aggregateBuyers, buildBuyerTagMap, getTopTags } from '@/app/lib/buyer-utils'
import type { BandcampBuyer, CrawlItemResult } from '@/app/lib/shared/types'

const buyer = (url: string): BandcampBuyer => ({ image: null, name: url, url })

const item = (buyers: string[], tags: string[] = []): CrawlItemResult => ({
    buyers: buyers.map(buyer),
    tags,
    url: `https://bandcamp.com/item/${buyers.join('-')}`,
})

describe('aggregateBuyers', () => {
    it('returns empty array for no results', () => {
        expect(aggregateBuyers([])).toEqual([])
    })

    it('counts a single buyer once', () => {
        const result = aggregateBuyers([item(['alice'])])
        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({ buyer: buyer('alice'), count: 1 })
    })

    it('deduplicates the same buyer across items', () => {
        const results = [item(['alice']), item(['alice']), item(['alice'])]
        const agg = aggregateBuyers(results)
        expect(agg).toHaveLength(1)
        expect(agg[0].count).toBe(3)
    })

    it('counts distinct buyers independently', () => {
        const results = [item(['alice', 'bob']), item(['bob'])]
        const agg = aggregateBuyers(results)
        const byUrl = Object.fromEntries(agg.map(b => [b.buyer.url, b.count]))
        expect(byUrl['alice']).toBe(1)
        expect(byUrl['bob']).toBe(2)
    })

    it('sorts by count descending', () => {
        const results = [item(['alice']), item(['bob']), item(['bob']), item(['carol']), item(['carol']), item(['carol'])]
        const agg = aggregateBuyers(results)
        expect(agg.map(b => b.buyer.url)).toEqual(['carol', 'bob', 'alice'])
    })
})

describe('buildBuyerTagMap', () => {
    it('returns empty map for no results', () => {
        expect(buildBuyerTagMap([])).toEqual(new Map())
    })

    it('skips items with no tags', () => {
        const result = buildBuyerTagMap([item(['alice'], [])])
        expect(result.has('alice')).toBe(false)
    })

    it('maps buyer to tags from a single item', () => {
        const result = buildBuyerTagMap([item(['alice'], ['jazz', 'soul'])])
        expect(result.get('alice')).toEqual(new Set(['jazz', 'soul']))
    })

    it('accumulates tags across multiple items for the same buyer', () => {
        const results = [
            item(['alice'], ['jazz']),
            item(['alice'], ['soul']),
        ]
        const result = buildBuyerTagMap(results)
        expect(result.get('alice')).toEqual(new Set(['jazz', 'soul']))
    })

    it('does not duplicate tags seen multiple times', () => {
        const results = [item(['alice'], ['jazz']), item(['alice'], ['jazz'])]
        const result = buildBuyerTagMap(results)
        expect(result.get('alice')?.size).toBe(1)
    })
})

describe('getTopTags', () => {
    it('returns empty array for no results', () => {
        expect(getTopTags([], 10)).toEqual([])
    })

    it('counts tag frequency across items', () => {
        const results = [
            item([], ['jazz', 'soul']),
            item([], ['jazz']),
            item([], ['classical']),
        ]
        const top = getTopTags(results, 10)
        expect(top[0]).toBe('jazz')
    })

    it('respects the limit', () => {
        const results = [
            item([], ['a', 'b', 'c', 'd', 'e']),
        ]
        expect(getTopTags(results, 3)).toHaveLength(3)
    })

    it('returns all tags when limit exceeds tag count', () => {
        const results = [item([], ['jazz', 'soul'])]
        expect(getTopTags(results, 100)).toHaveLength(2)
    })
})
