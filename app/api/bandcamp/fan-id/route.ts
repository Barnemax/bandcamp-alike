import { NextRequest } from 'next/server'
import { parsePageDataBlob } from '@/app/lib/shared/utils'

async function extractFanIdFromProfileUrl(profileUrl: string): Promise<{ fanId: string, username: string }> {
    const res = await fetch(profileUrl, {
        headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (compatible; BandcampAlike/1.0)',
        },
    })

    if (!res.ok) {
        throw new Error(`Failed to fetch profile page: HTTP ${res.status}`)
    }

    const html = await res.text()
    const blob = parsePageDataBlob(html)

    if (!blob) {
        throw new Error('Could not find pagedata blob on this page. Is this a valid Bandcamp profile URL?')
    }

    const fanData = blob.fan_data
    const fanId = fanData?.fan_id
    const username = fanData?.username ?? ''

    if (!fanId) {
        throw new Error('fan_id not found in pagedata blob')
    }

    return { fanId: String(fanId), username: String(username) }
}

export async function POST(request: NextRequest): Promise<Response> {
    try {
        let body: { profileUrl?: unknown }
        try {
            body = await request.json()
        } catch {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const { profileUrl } = body

        if (!profileUrl || typeof profileUrl !== 'string') {
            return Response.json({ error: 'profileUrl is required' }, { status: 400 })
        }

        let url = profileUrl.trim()
        if (!url.startsWith('http')) {
            url = `https://bandcamp.com/${url}`
        }

        // Validate URL points to bandcamp.com to prevent SSRF
        try {
            const parsed = new URL(url)
            if (!parsed.hostname.endsWith('bandcamp.com')) {
                return Response.json({ error: 'URL must be a bandcamp.com profile' }, { status: 400 })
            }
        } catch {
            return Response.json({ error: 'Invalid URL' }, { status: 400 })
        }

        const { fanId, username } = await extractFanIdFromProfileUrl(url)

        return Response.json({ fanId, username })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)

        return Response.json({ error: message }, { status: 500 })
    }
}
