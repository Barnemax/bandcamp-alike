import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import type { CachedProfile } from '@/app/lib/shared/types'

const CACHE_DIR = path.join(process.cwd(), '.cache')
const INDEX_PATH = path.join(CACHE_DIR, 'index.json')

interface CacheEntry<T> {
  cachedAt: number
  data: T
}

function filePath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(CACHE_DIR, `${safe}.json`)
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath(key), 'utf-8')
    const entry: CacheEntry<T> = JSON.parse(raw)
    return entry.data
  } catch {
    return null
  }
}

export async function cacheSet<T>(key: string, data: T, profile: Omit<CachedProfile, 'cachedAt'>): Promise<void> {
  const now = Date.now()
  const entry: CacheEntry<T> = { cachedAt: now, data }
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(filePath(key), JSON.stringify(entry))
  await indexUpsert({ ...profile, cachedAt: now })
}

async function readIndex(): Promise<CachedProfile[]> {
  try {
    const raw = await readFile(INDEX_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function indexUpsert(profile: CachedProfile): Promise<void> {
  const index = await readIndex()
  const existing = index.findIndex(p => p.fanId === profile.fanId)
  if (existing !== -1) {
    index[existing] = profile
  } else {
    index.push(profile)
  }
  await writeFile(INDEX_PATH, JSON.stringify(index))
}

export async function getRecentProfiles(limit: number): Promise<CachedProfile[]> {
  const index = await readIndex()
  return index
    .sort((a, b) => b.cachedAt - a.cachedAt)
    .slice(0, limit)
}

export async function getAllProfiles(): Promise<CachedProfile[]> {
  const index = await readIndex()
  return index
    .sort((a, b) => b.cachedAt - a.cachedAt)
}

export async function cacheDelete(fanId: string): Promise<void> {
  const index = await readIndex()
  const profile = index.find(p => p.fanId === fanId)
  if (!profile) return

  const filtered = index.filter(p => p.fanId !== fanId)
  await writeFile(INDEX_PATH, JSON.stringify(filtered))

  try {
    const { unlink } = await import('fs/promises')
    await unlink(filePath(fanId))
  } catch {
    // file may not exist
  }
}
