// Centralized TanStack Query keys (kickoff §13.1). Invalidate by prefix, e.g. queryKeys.cities.all.
import type { AdminHotelListParams, HotelSearchParams, IsoDate } from './types'

export const queryKeys = {
  hotels: {
    all: ['hotels'] as const,
    search: (params: HotelSearchParams) => ['hotels', 'search', params] as const,
    featured: ['hotels', 'featured'] as const,
    detail: (id: number, checkIn: IsoDate, checkOut: IsoDate) =>
      ['hotels', 'detail', id, checkIn, checkOut] as const,
    adminList: (params: AdminHotelListParams) => ['hotels', 'admin-list', params] as const,
    manage: (id: number) => ['hotels', 'manage', id] as const,
  },
  visits: {
    recentlyVisited: ['visits', 'recently-visited'] as const,
    trending: ['visits', 'trending'] as const,
  },
  reviews: {
    byHotel: (hotelId: number) => ['reviews', 'by-hotel', hotelId] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    mine: (pageNumber: number) => ['bookings', 'mine', pageNumber] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
  },
  cities: {
    all: ['cities'] as const,
    list: (params: { keyword?: string; pageNumber?: number; pageSize?: number }) =>
      ['cities', 'list', params] as const,
  },
  amenities: ['amenities'] as const,
  rooms: {
    all: ['rooms'] as const,
    byHotel: (hotelId: number) => ['rooms', 'by-hotel', hotelId] as const,
  },
  users: {
    hotelOwners: ['users', 'hotel-owners'] as const,
  },
  attractions: (lat: number, lng: number) => ['attractions', lat, lng] as const,
}
