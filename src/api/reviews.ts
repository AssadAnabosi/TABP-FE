import { api } from './client'
import type { PageParams, Paged, ReviewDto } from './types'

export const reviewsApi = {
  byHotel: (hotelId: number, page: PageParams) =>
    api.get<Paged<ReviewDto>>(`/api/reviews/by-hotel/${hotelId}`, { ...page }),
}
