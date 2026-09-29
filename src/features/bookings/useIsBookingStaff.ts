import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/api/queryKeys'
import type { BookingDetailDto } from '@/api/types'
import { useSession } from '@/auth/session'
import { fetchManagedHotels } from '@/features/manage/hotels/managedHotels'

/**
 * True when the viewer runs the front desk for this booking: any Admin, or the HotelOwner who owns the
 * booking's hotel. Not every HotelOwner: owners also book other hotels as guests.
 */
export function useIsBookingStaff(booking: BookingDetailDto | undefined): boolean {
  const role = useSession((s) => s.user?.role)
  const isOwner = role === 'HotelOwner'

  // Same key as useManagedHotels for an owner, so it shares that cache.
  const ownHotels = useQuery({
    queryKey: [...queryKeys.hotels.all, 'managed', 'HotelOwner'],
    queryFn: () => fetchManagedHotels('HotelOwner'),
    enabled: isOwner && booking !== undefined,
  })

  if (role === 'Admin') return true
  return isOwner && booking !== undefined && (ownHotels.data?.some((h) => h.id === booking.hotelId) ?? false)
}
