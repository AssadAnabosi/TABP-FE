// Sequential create → confirm per cart item, with clear partial-failure reporting (kickoff §8.6).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { bookingsApi } from '@/api/bookings'
import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { cartItemKey, useCart, type CartItem } from '@/cart/cartStore'
import { logger } from '@/lib/logger'

export type ItemStatus =
  | { state: 'idle' }
  | { state: 'reserving' }
  | { state: 'paying' }
  | { state: 'done'; bookingId: string; confirmationNumber: string }
  | { state: 'failed'; step: 'reserve' | 'pay'; message: string }

export interface CheckoutResult {
  succeeded: Array<{ bookingId: string; confirmationNumber: string }>
  failed: number
}

function reserveErrorMessage(error: unknown): string {
  if (isApiError(error) && error.status === 409) return 'This room is no longer available for these dates.'
  if (isApiError(error)) return error.userMessage
  return 'Could not reserve this room.'
}

function payErrorMessage(error: unknown): string {
  if (isApiError(error) && error.status === 402) return error.detail ?? 'Payment was declined.'
  if (isApiError(error)) return error.userMessage
  return 'Payment failed.'
}

export function useCheckout() {
  const queryClient = useQueryClient()
  const update = useCart((s) => s.update)
  const remove = useCart((s) => s.remove)
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({})
  const [running, setRunning] = useState(false)

  const setStatus = (key: string, status: ItemStatus) => setStatuses((s) => ({ ...s, [key]: status }))

  async function run(
    items: CartItem[],
    input: { specialRequests?: string; cardToken: string },
  ): Promise<CheckoutResult> {
    setRunning(true)
    const result: CheckoutResult = { succeeded: [], failed: 0 }

    for (const item of items) {
      const key = cartItemKey(item)
      let bookingId = item.bookingId
      let confirmationNumber = item.confirmationNumber

      // 1) Reserve, unless a previous attempt already created the (Pending) booking.
      if (!bookingId) {
        setStatus(key, { state: 'reserving' })
        try {
          const created = await bookingsApi.create({
            roomId: item.roomId,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            adults: item.adults,
            children: item.children,
            specialRequests: input.specialRequests || null,
          })
          bookingId = created.bookingId
          confirmationNumber = created.confirmationNumber
          // Persist immediately so a retry (even after reload) only confirms, never creates again.
          update(key, {
            bookingId,
            confirmationNumber,
            serverTotal: created.totalPrice,
            currency: created.currency,
          })
        } catch (error) {
          logger.warn('Checkout: reserve failed', { roomId: item.roomId })
          setStatus(key, { state: 'failed', step: 'reserve', message: reserveErrorMessage(error) })
          result.failed++
          continue
        }
      }

      // 2) Pay.
      setStatus(key, { state: 'paying' })
      try {
        await bookingsApi.confirm(bookingId, input.cardToken)
      } catch (error) {
        // 409 on confirm = already confirmed: treat as success.
        if (!(isApiError(error) && error.status === 409)) {
          setStatus(key, { state: 'failed', step: 'pay', message: payErrorMessage(error) })
          result.failed++
          continue
        }
      }
      setStatus(key, { state: 'done', bookingId, confirmationNumber: confirmationNumber ?? '' })
      result.succeeded.push({ bookingId, confirmationNumber: confirmationNumber ?? '' })
      remove(key)
    }

    setRunning(false)
    await queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
    // Availability changed for the booked rooms.
    await queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
    return result
  }

  return { run, running, statuses }
}
