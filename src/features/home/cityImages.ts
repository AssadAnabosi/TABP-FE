// A city's image: its thumbnailUrl from the API, or a deterministic placeholder when an admin hasn't
// set one yet (picsum.photos is already the seed-data image host).
export function cityImage(city: { cityName: string; thumbnailUrl: string | null }): string {
  if (city.thumbnailUrl) return city.thumbnailUrl
  const slug = city.cityName.trim().toLowerCase().replace(/\s+/g, '-')
  return `https://picsum.photos/seed/city-${encodeURIComponent(slug)}/640/420`
}
