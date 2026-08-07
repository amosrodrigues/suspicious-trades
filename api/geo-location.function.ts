type GeolocationRequest = {
  city?: unknown
  country?: unknown
}

type NominatimResult = {
  lat?: string
  lon?: string
}

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

async function getGeoLocation(
  payload: GeolocationRequest = {}
): Promise<{ latitude: number; longitude: number } | null> {
  const city = getString(payload.city)
  const country = getString(payload.country)
  const location = [city, country].filter(Boolean).join(", ")

  if (!location) {
    return null
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(location)}`,
    { headers: { Accept: "application/json" } }
  )

  if (!response.ok) {
    throw new Error("OpenStreetMap could not find this location.")
  }

  const [result] = (await response.json()) as NominatimResult[]
  const latitude = Number(result?.lat)
  const longitude = Number(result?.lon)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return { latitude, longitude }
}

export default getGeoLocation
