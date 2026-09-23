import { useQuery } from '@tanstack/react-query'

import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { HotelDto } from '@/api/types'
import { defaultStay } from '@/lib/dates'

/**
 * A hotel's current amenities and images are only exposed by the public detail endpoint, which
 * 404s until the hotel is approved (kickoff §9 G6). Returns nothing for unapproved hotels.
 */
export function usePublicHotel(hotel: HotelDto) {
  const stay = defaultStay()
  return useQuery({
    queryKey: queryKeys.hotels.detail(hotel.id, stay.checkIn, stay.checkOut),
    queryFn: () => hotelsApi.detail(hotel.id, stay),
    enabled: hotel.approvalStatus === 'Approved',
  })
}
