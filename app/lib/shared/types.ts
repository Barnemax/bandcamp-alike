// Bandcamp data-shape types — sourced from @barnemax/bandcamp-types
export type { TralbumType, CollectorsBlob, BandcampCollectionItem, BandcampCollectionResponse } from '@barnemax/bandcamp-types'

export interface PageDataBlob {
    collection_count?: number
    fan_data?: {
        fan_id: number | string
        username?: string
    }
}

export interface BandcampBuyer {
    image: string | null
    name: string
    url: string
}

export interface CrawlItemResult {
    buyers: BandcampBuyer[]
    error?: string
    tags: string[]
    url: string
}

export interface EnrichedBuyer {
    buyer: BandcampBuyer
    percentage: number
    sharedCount: number
    totalCollection: number
}

export interface CachedProfile {
    cachedAt: number
    fanId: string
    itemCount: number
    username: string
}

export interface CachedResult {
    enrichedBuyers: EnrichedBuyer[]
    results: CrawlItemResult[]
}

export interface BuyerCount {
    buyer: BandcampBuyer
    count: number
}

export interface StreamStatus {
    message: string
    completed?: number
    total?: number
}

export type SortMode = 'count' | 'percentage'

export interface BuyerRow {
    buyer: BandcampBuyer
    count: number
    tags: string[]
}

export interface ExportData {
    name: string
    itemCount: number
    buyers: BuyerRow[]
    enrichedBuyers: EnrichedBuyer[]
}
