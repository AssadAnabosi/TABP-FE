// The hotels the signed-in manager can act on: every hotel for an Admin, their own for a HotelOwner.
// Walks the paged endpoint at its max page size, for pickers and the owner's grid.
import { useQuery } from '@tanstack/react-query'

import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { HotelDto, Paged, UserRole } from '@/api/types'
import { useSession } from '@/auth/session'

const PAGE_SIZE = 50 // the endpoints' maximum
const MAX_PAGES = 20 // safety valve: 1000 hotels

async function fetchAll(fetchPage: (pageNumber: number) => Promise<Paged<HotelDto>>): Promise<HotelDto[]> {
  const hotels: HotelDto[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await fetchPage(page)
    hotels.push(...result.items)
    if (!result.hasNextPage) break
  }
  return hotels.sort((a, b) => a.name.localeCompare(b.name))
}

export function fetchManagedHotels(role: UserRole): Promise<HotelDto[]> {
  return role === 'Admin'
    ? fetchAll((pageNumber) => hotelsApi.list({ pageNumber, pageSize: PAGE_SIZE }))
    : fetchAll((pageNumber) => hotelsApi.mine({ pageNumber, pageSize: PAGE_SIZE }))
}

export function useManagedHotels() {
  const role = useSession((s) => s.user?.role)
  return useQuery({
    queryKey: [...queryKeys.hotels.all, 'managed', role],
    queryFn: () => fetchManagedHotels(role!),
    enabled: role === 'Admin' || role === 'HotelOwner',
  })
}
