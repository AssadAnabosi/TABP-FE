// Every hotel, for pickers that need the full list (e.g. the Rooms page's hotel selector).
// The grid itself pages server-side; this walks GET /api/hotels at its max page size.
import { hotelsApi } from '@/api/hotels'
import type { HotelDto } from '@/api/types'

const PAGE_SIZE = 50 // the endpoint's maximum
const MAX_PAGES = 20 // safety valve: 1000 hotels

export async function fetchAllHotels(): Promise<HotelDto[]> {
  const hotels: HotelDto[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await hotelsApi.list({ pageNumber: page, pageSize: PAGE_SIZE })
    hotels.push(...result.items)
    if (!result.hasNextPage) break
  }
  return hotels.sort((a, b) => a.name.localeCompare(b.name))
}
