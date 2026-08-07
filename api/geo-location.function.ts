type GeolocationRequest = {
  city?: unknown
  country?: unknown
}

type NominatimResult = {
  lat?: string
  lon?: string
}

type Coordinates = {
  latitude: number
  longitude: number
}

type CacheEntry = {
  expiresAt: number
  value: Coordinates | null
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 500
const MIN_REQUEST_INTERVAL_MS = 1000
const cache = new Map<string, CacheEntry>()
let requestQueue: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

async function getGeoLocation(
  payload: GeolocationRequest = {}
): Promise<Coordinates | null> {
  const city = getString(payload.city)
  const country = getString(payload.country)
  const location = [city, country].filter(Boolean).join(", ")

  if (!location) {
    return null
  }

  const cacheKey = location.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const request = requestQueue.then(async () => {
    const waitTime = Math.max(
      0,
      MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt)
    )
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    lastRequestAt = Date.now()
    return fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(location)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "my.suspicious.trades/0.0.10 (Dynatrace App)"
        }
      }
    )
  })
  requestQueue = request.catch(() => undefined)
  const response = await request

  if (!response.ok) {
    throw new Error("OpenStreetMap could not find this location.")
  }

  const [result] = (await response.json()) as NominatimResult[]
  const latitude = Number(result?.lat)
  const longitude = Number(result?.lon)

  const value =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = Array.from(cache.keys())[0]
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value })

  return value
}

export default getGeoLocation
