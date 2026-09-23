import { api } from './client'
import type { PageParams, Paged, ReviewDto, ReviewRequest } from './types'

export const reviewsApi = {
  byHotel: (hotelId: number, page: PageParams) =>
    api.get<Paged<ReviewDto>>(`/api/reviews/by-hotel/${hotelId}`, { ...page }),
  /** 400 unless the user completed a stay at the hotel and hasn't reviewed it yet. */
  create: (hotelId: number, body: ReviewRequest) => api.post<ReviewDto>('/api/reviews', { hotelId, ...body }),
  /** Author only. */
  update: (id: number, body: ReviewRequest) => api.put<ReviewDto>(`/api/reviews/${id}`, body),
  /** Author or Admin. */
  delete: (id: number) => api.delete(`/api/reviews/${id}`),
}
