// Client-side cart (kickoff §8.5). The backend has no cart: bookings are created at checkout.
// Persisted in localStorage so it survives reloads and the login redirect. It never holds tokens.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Guid, IsoDate, RoomType } from '@/api/types'
import { isPastIsoDate, nightsBetween } from '@/lib/dates'

export interface CartItem {
  hotelId: number
  hotelName: string
  hotelAddress?: string
  cityName?: string
  roomId: number
  roomType: RoomType
  checkIn: IsoDate
  checkOut: IsoDate
  adults: number
  children: number
  pricePerNight: number
  currency: string
  thumbnailUrl: string | null
  /** Set once the booking was created (Pending). A retry must only confirm, never create again. */
  bookingId?: Guid
  confirmationNumber?: string
  serverTotal?: number
}

export function cartItemKey(item: Pick<CartItem, 'roomId' | 'checkIn' | 'checkOut'>): string {
  return `${item.roomId}|${item.checkIn}|${item.checkOut}`
}

/** Estimate only: the server computes the authoritative total at booking time. */
export function estimatedTotal(item: CartItem): number {
  return item.serverTotal ?? item.pricePerNight * nightsBetween(item.checkIn, item.checkOut)
}

/** A not-yet-booked item whose check-in has passed can't be booked any more. */
export function isStale(item: CartItem): boolean {
  return !item.bookingId && isPastIsoDate(item.checkIn)
}

interface CartState {
  items: CartItem[]
  /** Returns false when the same room + dates is already in the cart. */
  add: (item: CartItem) => boolean
  remove: (key: string) => void
  update: (key: string, patch: Partial<CartItem>) => void
  clear: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const key = cartItemKey(item)
        if (get().items.some((i) => cartItemKey(i) === key)) return false
        set((s) => ({ items: [...s.items, item] }))
        return true
      },
      remove: (key) => set((s) => ({ items: s.items.filter((i) => cartItemKey(i) !== key) })),
      update: (key, patch) =>
        set((s) => ({ items: s.items.map((i) => (cartItemKey(i) === key ? { ...i, ...patch } : i)) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'tabp.cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
