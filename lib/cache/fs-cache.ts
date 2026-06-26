/**
 * Local filesystem cache, keyed by a sha256 of the cache key.
 * Guarantees "inspect/scrape once": expensive steps read from here on re-runs.
 *
 * Layout: .cache/<namespace>/<sha256>.json
 */
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

export type CacheNamespace = "raw" | "inspect" | "tools" | "output" | "traces"

const CACHE_ROOT = path.resolve(process.cwd(), ".cache")

export function hashKey(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32)
}

function cachePath(ns: CacheNamespace, key: string): string {
  return path.join(CACHE_ROOT, ns, `${hashKey(key)}.json`)
}

export async function cacheGet<T>(
  ns: CacheNamespace,
  key: string
): Promise<T | null> {
  try {
    const raw = await fs.readFile(cachePath(ns, key), "utf-8")
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function cacheSet<T>(
  ns: CacheNamespace,
  key: string,
  value: T
): Promise<void> {
  const filePath = cachePath(ns, key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8")
}

/**
 * Return cached value if present; otherwise run `factory`, cache, and return it.
 * `hit` reports whether the value came from cache (useful for tracing).
 */
export async function cacheGetOrSet<T>(
  ns: CacheNamespace,
  key: string,
  factory: () => Promise<T>
): Promise<{ value: T; hit: boolean }> {
  const existing = await cacheGet<T>(ns, key)
  if (existing !== null) return { value: existing, hit: true }
  const value = await factory()
  await cacheSet(ns, key, value)
  return { value, hit: false }
}

export function cacheRoot(): string {
  return CACHE_ROOT
}
