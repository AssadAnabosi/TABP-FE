import { api, requestBlob } from './client'
import type {
  BookingDetailDto,
  BookingDto,
  BookingListItemDto,
  CreateBookingRequest,
  CreateBookingResponse,
  Guid,
  PageParams,
  Paged,
} from './types'

export const bookingsApi = {
  /** Reserves the room as a Pending booking. */
  create: (body: CreateBookingRequest) => api.post<CreateBookingResponse>('/api/bookings', body),
  /** Charges the (mock) gateway. 402 = payment failed, 409 = not pending (already confirmed). */
  confirm: (id: Guid, cardToken: string) =>
    api.post<BookingDto>(`/api/bookings/${id}/confirm`, { cardToken }),
  mine: (page: PageParams) => api.get<Paged<BookingListItemDto>>('/api/bookings/mine', { ...page }),
  detail: (id: Guid) => api.get<BookingDetailDto>(`/api/bookings/${id}`),
  confirmationPdf: (id: Guid) => requestBlob(`/api/bookings/${id}/confirmation-pdf`),
}
