import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { decodeHtmlEntities, parsePageDataBlob, timeAgo } from '@/app/lib/shared/utils'

describe('decodeHtmlEntities', () => {
    it('decodes &quot;', () => expect(decodeHtmlEntities('say &quot;hello&quot;')).toBe('say "hello"'))
    it('decodes &amp;', () => expect(decodeHtmlEntities('rock &amp; roll')).toBe('rock & roll'))
    it('decodes &lt; and &gt;', () => expect(decodeHtmlEntities('&lt;div&gt;')).toBe('<div>'))
    it('decodes &#39;', () => expect(decodeHtmlEntities('it&#39;s')).toBe("it's"))
    it('leaves plain strings unchanged', () => expect(decodeHtmlEntities('hello world')).toBe('hello world'))
    it('handles multiple entities in one string', () => {
        expect(decodeHtmlEntities('&lt;a href=&quot;x&quot;&gt;rock &amp; roll&lt;/a&gt;'))
            .toBe('<a href="x">rock & roll</a>')
    })
})

describe('parsePageDataBlob', () => {
    it('returns null when no pagedata element exists', () => {
        expect(parsePageDataBlob('<html></html>')).toBeNull()
    })

    it('parses a Bandcamp-style HTML-encoded data-blob', () => {
        // Bandcamp encodes the JSON blob in a double-quoted attribute using &quot;
        const data = { fan_data: { fan_id: 42 } }
        const encoded = JSON.stringify(data).replace(/"/g, '&quot;')
        const html = `<div id="pagedata" data-blob="${encoded}"></div>`
        expect(parsePageDataBlob(html)).toEqual(data)
    })

    it('handles single-quoted attribute with no inner quotes', () => {
        // Regex uses [^"']+ so single-quoted blobs only work when the value has no quotes
        const html = '<div id="pagedata" data-blob=\'42\'></div>'
        // JSON.parse('42') is valid but cast to PageDataBlob — just confirm it doesn't throw
        expect(parsePageDataBlob(html)).toBe(42)
    })

    it('returns null for malformed JSON in data-blob', () => {
        const html = '<div id="pagedata" data-blob="not-json"></div>'
        expect(parsePageDataBlob(html)).toBeNull()
    })

    it('parses collection_count from HTML-encoded blob', () => {
        const data = { collection_count: 5 }
        const encoded = JSON.stringify(data).replace(/"/g, '&quot;')
        const html = `<div id="pagedata" data-blob="${encoded}"></div>`
        expect(parsePageDataBlob(html)).toEqual(data)
    })
})

describe('timeAgo', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns seconds for < 1 minute ago', () => {
        const ts = Date.now() - 30 * 1000
        expect(timeAgo(ts)).toMatch(/second/)
    })

    it('returns minutes for < 1 hour ago', () => {
        const ts = Date.now() - 15 * 60 * 1000
        expect(timeAgo(ts)).toMatch(/minute/)
    })

    it('returns hours for < 1 day ago', () => {
        const ts = Date.now() - 3 * 60 * 60 * 1000
        expect(timeAgo(ts)).toMatch(/hour/)
    })

    it('returns days for < 1 week ago', () => {
        const ts = Date.now() - 3 * 24 * 60 * 60 * 1000
        expect(timeAgo(ts)).toMatch(/day/)
    })

    it('returns weeks for < 5 weeks ago', () => {
        const ts = Date.now() - 14 * 24 * 60 * 60 * 1000
        expect(timeAgo(ts)).toMatch(/week/)
    })

    it('returns months for >= 5 weeks ago', () => {
        const ts = Date.now() - 60 * 24 * 60 * 60 * 1000
        expect(timeAgo(ts)).toMatch(/month/)
    })
})
