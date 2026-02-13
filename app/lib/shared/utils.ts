import type { PageDataBlob } from './types'

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(timestamp: number): string {
    const seconds = Math.round((timestamp - Date.now()) / 1000);
    const mins = Math.round(seconds / 60);
    const hours = Math.round(mins / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30);

    if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second');
    if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    if (Math.abs(days) < 7) return rtf.format(days, 'day');
    if (Math.abs(weeks) < 5) return rtf.format(weeks, 'week');
    return rtf.format(months, 'month');
}

export function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
}

export function parsePageDataBlob(html: string): PageDataBlob | null {
    const match = html.match(/id=["']pagedata["'][^>]*data-blob=["']([^"']+)["']/)
    if (!match) return null

    try {
        return JSON.parse(decodeHtmlEntities(match[1])) as PageDataBlob
    } catch {
        return null
    }
}
