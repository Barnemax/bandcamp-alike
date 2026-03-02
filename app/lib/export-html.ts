import type { ExportData } from '@/app/lib/shared/types'

function escapeHtmlStr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function generateHtmlExport(data: ExportData): string {
    const enrichedMap = new Map(data.enrichedBuyers.map(eb => [eb.buyer.url, eb]))
    const hasEnriched = data.enrichedBuyers.length > 0

    const buyers = data.buyers.map(({ buyer, count, tags }) => {
        const eb = enrichedMap.get(buyer.url)

        return {
            buyer,
            count,
            percentage: eb?.percentage ?? null,
            sharedCount: eb?.sharedCount ?? null,
            tags,
            totalCollection: eb?.totalCollection ?? null,
        }
    })

    // Top tags by frequency
    const tagCounts = new Map<string, number>()
    for (const b of buyers) {
        for (const t of b.tags) {
            tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
        }
    }
    const topTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag]) => tag)

    // Index map: tag name → position (used for CSS class names, avoids escaping)
    const topTagIndex = new Map(topTags.map((t, i) => [t, i]))

    // Render buyer cards for a sorted list
    const renderCards = (list: typeof buyers, mode: 'count' | 'percentage'): string =>
        list.map((b, i) => {
            const imgHtml = b.buyer.image
                ? `<img src="${escapeHtmlStr(b.buyer.image)}" alt="" class="fan-img">`
                : ''
            const statHtml = mode === 'percentage' && b.percentage !== null
                ? `${b.percentage}%<span class="fan-stat-detail">(${b.sharedCount}/${b.totalCollection})</span>`
                : `${b.count} shared`
            const displayTags = b.tags.slice(0, 10)
            const remaining = b.tags.length - displayTags.length
            const tagsHtml = displayTags.length > 0
                ? `<div class="fan-tags">${displayTags.map(t => `<span class="fan-tag">${escapeHtmlStr(t)}</span>`).join('')}${remaining > 0 ? `<span class="fan-tag-more">+${remaining} more</span>` : ''}</div>`
                : ''
            const tagClasses = b.tags
                .filter(t => topTagIndex.has(t))
                .map(t => `tag-${topTagIndex.get(t)}`)
                .join(' ')

            return (
                `<a href="${escapeHtmlStr(b.buyer.url)}" target="_blank" rel="noopener noreferrer" class="fan-card${tagClasses ? ' ' + tagClasses : ''}">` +
                '<div class="fan-row">' +
                `<span class="fan-rank">${i + 1}</span>` +
                imgHtml +
                `<span class="fan-name">${escapeHtmlStr(b.buyer.name)}</span>` +
                `<span class="fan-stat">${statHtml}</span>` +
                '</div>' +
                tagsHtml +
                '</a>'
            )
        }).join('')

    const countSorted = [...buyers].sort((a, b) => b.count - a.count)
    const pctSorted = hasEnriched
        ? [...buyers].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0) || b.count - a.count)
        : []

    const gridCountHtml = renderCards(countSorted, 'count')
    const gridPctHtml = hasEnriched ? renderCards(pctSorted, 'percentage') : ''

    const labelChips = topTags.map((t, i) =>
        `<label for="tf-${i}" class="tag-chip">${escapeHtmlStr(t)}</label>`
    ).join('')

    // CSS using ~ sibling selectors — works without :has(), compatible with all WebViews
    // All hidden inputs (sort radios + tag checkboxes) are placed before <main> in the DOM
    // so they can target descendants of <main> via:  #input:checked ~ main .target
    const hideAllRules = topTags.length > 0
        ? topTags.map((_, i) => `#tf-${i}:checked ~ main .fan-card`).join(',\n  ') + ' { display: none; }'
        : ''
    // Show-match specificity (1,3,1) beats hide-all (1,2,1), so OR logic works across multiple checked boxes
    const showMatchRules = topTags.map((_, i) =>
        `#tf-${i}:checked ~ main .fan-card.tag-${i} { display: flex; }`
    ).join('\n  ')
    const activeChipRules = topTags.map((_, i) =>
        `#tf-${i}:checked ~ main label[for="tf-${i}"] { background: #3b82f6; color: #fff; border-color: #3b82f6; }`
    ).join('\n  ')
    const clearVisibleRules = topTags.length > 0
        ? topTags.map((_, i) => `#tf-${i}:checked ~ main .tag-clear`).join(',\n  ') + ' { display: inline-block; }'
        : ''

    // Sort inputs + CSS (only when enriched data exists)
    const sortRadios = hasEnriched
        ? '<input type="radio" name="sort" id="sort-count" class="sort-input"><input type="radio" name="sort" id="sort-pct" class="sort-input" checked>'
        : ''
    const sortCss = hasEnriched ? `
  #sort-count:checked ~ main #grid-pct { display: none; }
  #sort-pct:checked ~ main #grid-count { display: none; }
  #sort-count:checked ~ main label[for="sort-count"] { background: #fafafa; color: #000; border-color: transparent; }
  #sort-pct:checked ~ main label[for="sort-pct"] { background: #fafafa; color: #000; border-color: transparent; }` : ''

    const sortBarHtml = hasEnriched
        ? `<div class="sort-bar">
    <label for="sort-count" class="sort-btn">Most items shared</label>
    <label for="sort-pct" class="sort-btn">Most % shared</label>
  </div>`
        : `<div class="sort-bar">
    <span class="sort-btn active">Most items shared</span>
    <span class="sort-btn disabled">Most % shared</span>
  </div>`

    const tagFilterInputs = topTags.map((_, i) =>
        `<input type="checkbox" id="tf-${i}" class="tag-filter" form="tf">`
    ).join('')

    const safeName = escapeHtmlStr(data.name)

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeName} | Bandcamp Alike</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; }
  main { max-width: 768px; width: 100%; padding: 64px 32px; display: flex; flex-direction: column; gap: 24px; }
  h1 { font-size: 24px; font-weight: 600; color: #fafafa; }
  .subtitle { font-size: 13px; color: #71717a; }
  .tags { display: flex; flex-wrap: wrap; gap: 8px; }
  .sort-input, .tag-filter { display: none; }
  .tag-chip { font-size: 12px; padding: 4px 10px; border-radius: 9999px; border: 1px solid #3f3f46; background: #18181b; color: #a1a1aa; cursor: pointer; transition: all 0.15s; display: inline-block; user-select: none; }
  .tag-chip:hover { border-color: #60a5fa; }
  .tag-clear { display: none; font-size: 12px; padding: 4px 10px; border-radius: 9999px; border: none; background: transparent; color: #71717a; cursor: pointer; }
  .tag-clear:hover { color: #d4d4d8; }
  .sort-bar { display: flex; gap: 8px; }
  .sort-btn { font-size: 13px; padding: 6px 12px; border-radius: 8px; border: 1px solid #3f3f46; background: transparent; color: #a1a1aa; cursor: pointer; transition: all 0.15s; display: inline-block; user-select: none; }
  .sort-btn:hover { border-color: #71717a; }
  .sort-btn.active { background: #fafafa; color: #000; border-color: transparent; }
  .sort-btn.disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
  .grid { display: grid; gap: 8px; }
  .fan-card { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; text-decoration: none; transition: background-color 0.15s; }
  .fan-card:hover { background: #18181b; }
  .fan-row { display: flex; align-items: center; gap: 12px; }
  .fan-rank { font-size: 13px; font-family: monospace; color: #71717a; width: 24px; }
  .fan-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: #27272a; }
  .fan-name { color: #f4f4f5; font-weight: 500; }
  .fan-stat { margin-left: auto; font-size: 13px; color: #71717a; text-align: right; }
  .fan-stat-detail { color: #52525b; margin-left: 4px; }
  .fan-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-left: 36px; margin-top: 4px; align-items: center; }
  .fan-tag { font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: #27272a; color: #a1a1aa; }
  .fan-tag-more { font-size: 11px; color: #52525b; }
  footer { width: 100%; text-align: center; font-size: 12px; color: #71717a; padding: 24px 0; }
  footer a { color: inherit; text-decoration: underline; }
  footer a:hover { color: #a1a1aa; }
  ${hideAllRules}
  ${showMatchRules}
  ${activeChipRules}
  ${clearVisibleRules}${sortCss}
</style>
</head>
<body>
<form id="tf"></form>
${sortRadios}${tagFilterInputs}
<main>
  <div>
    <h1>Results for ${safeName}</h1>
    <p class="subtitle" style="margin-top:4px">${data.itemCount} items crawled &middot; exported ${new Date().toLocaleDateString()}</p>
  </div>
  <div class="tags">
    ${labelChips}
    <button type="reset" form="tf" class="tag-clear">Clear</button>
  </div>
  ${sortBarHtml}
  <div id="grid-count" class="grid">${gridCountHtml}</div>
  ${hasEnriched ? `<div id="grid-pct" class="grid">${gridPctHtml}</div>` : ''}
</main>
<footer>Provided by <a href="https://barnemax.com" target="_blank" rel="noopener noreferrer">barnemax</a></footer>
</body>
</html>`
}

export function downloadHtml(html: string, filename: string): void {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
