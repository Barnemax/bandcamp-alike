# Bandcamp Alike

Find people with similar music taste by crawling your Bandcamp collection and comparing buyers across items.

## How it works

1. Enter your Bandcamp profile URL
2. The app fetches your collection and crawls each item page
3. It extracts buyers from each item and ranks them by overlap with your collection
4. Results show the top 25 users who share the most items with you

## Stack

- **Next.js** (App Router) + React + TypeScript
- **Tailwind CSS** for styling
- No database — results are computed on the fly and cached in-memory
- `node-html-parser` for server-side HTML parsing, `p-limit` for concurrency control

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Crawling speed

The defaults in [app/lib/crawl-buyers.ts](app/lib/crawl-buyers.ts) are intentionally cautious:

```ts
const MAX_CONCURRENT = 4      // parallel item page fetches
const REQUEST_DELAY_MS = 2500 // delay before each fetch
```

Large collections (1000+ items) will take a long time. You can increase `MAX_CONCURRENT` and lower `REQUEST_DELAY_MS`, but be mindful — Bandcamp will 429 you if you push too hard. The app respects `Retry-After` headers and retries failed items, but too aggressive settings will result in incomplete results.

## Data & ethics

All data this app accesses is **publicly visible** on Bandcamp — collections, buyers, and profiles are not scraped from anywhere private. This is a personal tool for music discovery, not a data harvesting platform. Do not use it to build commercial products, sell data.


## License

MIT