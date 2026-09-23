import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogIn, LogOut, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { bookingsApi } from '@/api/bookings'
import { queryKeys } from '@/api/queryKeys'
import type { BookingStatus, Guid } from '@/api/types'

export interface FrontDeskAction {
  label: string
  icon: LucideIcon
  run: () => void
  pending: boolean
}

/**
 * The next front-desk step for a booking: check in (Confirmed → CheckedIn) or check out
 * (CheckedIn → CheckedOut). Null when there's nothing to do. The API allows the hotel's owner or an
 * Admin (403 otherwise) and answers a wrong state with 409 (shown by the global error toast).
 */
export function useFrontDesk(booking: {
  id: Guid
  status: BookingStatus
  confirmationNumber: string
}): FrontDeskAction | null {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
  }

  const checkIn = useMutation({
    mutationFn: () => bookingsApi.checkIn(booking.id),
    onSuccess: () => toast.success(`Guest checked in (#${booking.confirmationNumber}).`),
    onSettled: refresh,
  })
  const checkOut = useMutation({
    mutationFn: () => bookingsApi.checkOut(booking.id),
    onSuccess: () => toast.success(`Guest checked out (#${booking.confirmationNumber}).`),
    onSettled: refresh,
  })

  if (booking.status === 'Confirmed')
    return { label: 'Check in', icon: LogIn, run: () => checkIn.mutate(), pending: checkIn.isPending }
  if (booking.status === 'CheckedIn')
    return { label: 'Check out', icon: LogOut, run: () => checkOut.mutate(), pending: checkOut.isPending }
  return null
}
