import type { ExportData } from '@/app/lib/shared/types'

function escapeHtmlStr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Escape a string for safe embedding inside a <script> tag (prevents </script> injection) */
function safeJsonForScript(json: string): string {
    return json.replace(/<\//g, '<\\/')
}

export function generateHtmlExport(data: ExportData): string {
    // Build unified buyer data with enriched info merged in
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

    // Compute top tags from buyer tag arrays (by frequency)
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

    // Serialize data for the embedded script (escape to prevent XSS via </script> injection)
    const jsonBuyers = safeJsonForScript(JSON.stringify(buyers))
    const jsonTopTags = safeJsonForScript(JSON.stringify(topTags))
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
  .tag-chip { font-size: 12px; padding: 4px 10px; border-radius: 9999px; border: 1px solid #3f3f46; background: #18181b; color: #a1a1aa; cursor: pointer; transition: all 0.15s; }
  .tag-chip:hover { border-color: #60a5fa; }
  .tag-chip.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
  .tag-clear { font-size: 12px; padding: 4px 10px; border-radius: 9999px; border: none; background: transparent; color: #71717a; cursor: pointer; transition: color 0.15s; }
  .tag-clear:hover { color: #d4d4d8; }
  .sort-bar { display: flex; gap: 8px; }
  .sort-btn { font-size: 13px; padding: 6px 12px; border-radius: 8px; border: 1px solid #3f3f46; background: transparent; color: #a1a1aa; cursor: pointer; transition: all 0.15s; }
  .sort-btn:hover { border-color: #71717a; }
  .sort-btn.active { background: #fafafa; color: #000; border-color: transparent; }
  .sort-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .grid { display: grid; gap: 8px; }
  .fan-card { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; text-decoration: none; transition: background-color 0.15s; }
  .fan-card:hover { background: #18181b; }
  .fan-row { display: flex; align-items: center; gap: 12px; }
  .fan-rank { font-size: 13px; font-family: monospace; color: #71717a; width: 24px; }
  .fan-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
  .fan-name { color: #f4f4f5; font-weight: 500; }
  .fan-stat { margin-left: auto; font-size: 13px; color: #71717a; text-align: right; }
  .fan-stat-detail { color: #52525b; margin-left: 4px; }
  .fan-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-left: 36px; margin-top: 4px; align-items: center; }
  .fan-tag { font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: #27272a; color: #a1a1aa; }
  .fan-tag-more { font-size: 11px; color: #52525b; }
  .no-match { font-size: 13px; color: #71717a; margin-top: 16px; }
  footer { width: 100%; text-align: center; font-size: 12px; color: #71717a; padding: 24px 0; }
  footer a { color: inherit; text-decoration: underline; }
  footer a:hover { color: #a1a1aa; }
</style>
</head>
<body>
<main>
  <div>
    <h1>Results for ${safeName}</h1>
    <p class="subtitle" style="margin-top:4px">${data.itemCount} items crawled &middot; exported ${new Date().toLocaleDateString()}</p>
  </div>
  <div id="tags" class="tags"></div>
  <div class="sort-bar">
    <button class="sort-btn" data-sort="count" onclick="setSort('count')">Most items shared</button>
    <button class="sort-btn" data-sort="percentage" onclick="setSort('percentage')" ${!hasEnriched ? 'disabled' : ''}>Most % shared</button>
  </div>
  <div id="grid" class="grid"></div>
</main>
<footer>Provided by <a href="https://barnemax.com" target="_blank" rel="noopener noreferrer">barnemax</a></footer>
<script>
const BUYERS = ${jsonBuyers};
const TOP_TAGS = ${jsonTopTags};
const HAS_ENRICHED = ${hasEnriched};

let selectedTags = new Set();
let sortMode = HAS_ENRICHED ? 'percentage' : 'count';

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderTags() {
  const container = document.getElementById('tags');
  if (TOP_TAGS.length === 0) { container.innerHTML = ''; return; }
  let html = TOP_TAGS.map(t =>
    '<button class="tag-chip' + (selectedTags.has(t) ? ' active' : '') + '" onclick="toggleTag(\\'' + escapeHtml(t).replace(/'/g, "\\\\'") + '\\')">' + escapeHtml(t) + '</button>'
  ).join('');
  if (selectedTags.size > 0) {
    html += '<button class="tag-clear" onclick="clearTags()">Clear</button>';
  }
  container.innerHTML = html;
}

function renderSortButtons() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === sortMode);
  });
}

function getFilteredSorted() {
  let list = [...BUYERS];

  if (selectedTags.size > 0) {
    list = list.filter(b => b.tags.some(t => selectedTags.has(t)));
  }

  if (sortMode === 'percentage' && HAS_ENRICHED) {
    list.sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0) || b.count - a.count);
  } else {
    list.sort((a, b) => b.count - a.count);
  }

  return list;
}

function renderGrid() {
  const list = getFilteredSorted();
  const container = document.getElementById('grid');

  if (list.length === 0 && selectedTags.size > 0) {
    container.innerHTML = '<p class="no-match">No buyers match the selected tags.</p>';
    return;
  }

  container.innerHTML = list.map((b, i) => {
    const imgHtml = b.buyer.image
      ? '<img src="' + escapeHtml(b.buyer.image) + '" alt="" class="fan-img">'
      : '';

    let statHtml;
    if (sortMode === 'percentage' && b.percentage !== null) {
      statHtml = b.percentage + '%<span class="fan-stat-detail">(' + b.sharedCount + '/' + b.totalCollection + ')</span>';
    } else {
      statHtml = b.count + ' shared';
    }

    const displayTags = b.tags.slice(0, 10);
    const remaining = b.tags.length - displayTags.length;
    const tagsHtml = displayTags.length > 0
      ? '<div class="fan-tags">' +
        displayTags.map(t => '<span class="fan-tag">' + escapeHtml(t) + '</span>').join('') +
        (remaining > 0 ? '<span class="fan-tag-more">+' + remaining + ' more</span>' : '') +
        '</div>'
      : '';

    return '<a href="' + escapeHtml(b.buyer.url) + '" target="_blank" rel="noopener noreferrer" class="fan-card">' +
      '<div class="fan-row">' +
        '<span class="fan-rank">' + (i + 1) + '</span>' +
        imgHtml +
        '<span class="fan-name">' + escapeHtml(b.buyer.name) + '</span>' +
        '<span class="fan-stat">' + statHtml + '</span>' +
      '</div>' +
      tagsHtml +
    '</a>';
  }).join('');
}

function toggleTag(tag) {
  if (selectedTags.has(tag)) selectedTags.delete(tag);
  else selectedTags.add(tag);
  renderTags();
  renderGrid();
}

function clearTags() {
  selectedTags.clear();
  renderTags();
  renderGrid();
}

function setSort(mode) {
  sortMode = mode;
  renderSortButtons();
  renderGrid();
}

renderTags();
renderSortButtons();
renderGrid();
</script>
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
