import { api, requestBlob } from './client'
import type {
  BookingDetailDto,
  BookingDto,
  BookingListItemDto,
  CreateBookingRequest,
  CreateBookingResponse,
  Guid,
  HotelBookingListItemDto,
  HotelBookingParams,
  PageParams,
  Paged,
} from './types'

export const bookingsApi = {
  /** Reserves the room as a Pending booking. */
  create: (body: CreateBookingRequest) => api.post<CreateBookingResponse>('/api/bookings', body),
  /** Charges the (mock) gateway. 402 = payment failed, 409 = not pending (already confirmed). */
  confirm: (id: Guid, cardToken: string) =>
    api.post<BookingDto>(`/api/bookings/${id}/confirm`, { cardToken }),
  /** Hotel owner or Admin. 409 unless Confirmed. */
  checkIn: (id: Guid) => api.post<void>(`/api/bookings/${id}/check-in`),
  /** Hotel owner or Admin. 409 unless CheckedIn. */
  checkOut: (id: Guid) => api.post<void>(`/api/bookings/${id}/check-out`),
  /** Front desk: a hotel's bookings, ordered by check-in (Admin or the hotel's owner). */
  byHotel: (hotelId: number, params: HotelBookingParams, signal?: AbortSignal) =>
    api.get<Paged<HotelBookingListItemDto>>(`/api/hotels/${hotelId}/bookings`, { ...params }, signal),
  mine: (page: PageParams) => api.get<Paged<BookingListItemDto>>('/api/bookings/mine', { ...page }),
  detail: (id: Guid) => api.get<BookingDetailDto>(`/api/bookings/${id}`),
  confirmationPdf: (id: Guid) => requestBlob(`/api/bookings/${id}/confirmation-pdf`),
}
