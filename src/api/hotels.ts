import { api } from './client'
import type {
  AdminHotelListParams,
  CreateHotelRequest,
  FeaturedDealDto,
  HotelDetailDto,
  HotelDto,
  HotelSearchParams,
  HotelSearchResultDto,
  ImageDto,
  IsoDate,
  PageParams,
  Paged,
  UpdateHotelRequest,
} from './types'

export const hotelsApi = {
  search: (params: HotelSearchParams, signal?: AbortSignal) =>
    api.get<Paged<HotelSearchResultDto>>('/api/hotels/search', { ...params }, signal),
  featuredDeals: (count = 5) => api.get<FeaturedDealDto[]>('/api/hotels/featured-deals', { count }),
  /** Always pass both dates, otherwise every room reports isAvailable: true (kickoff §9 G20). */
  detail: (id: number, stay: { checkIn: IsoDate; checkOut: IsoDate }, signal?: AbortSignal) =>
    api.get<HotelDetailDto>(`/api/hotels/${id}`, stay, signal),
  /** Admin: every hotel in any approval state (pageSize <= 50). */
  list: (params: AdminHotelListParams, signal?: AbortSignal) =>
    api.get<Paged<HotelDto>>('/api/hotels', { ...params }, signal),
  /** HotelOwner: their own hotels in any approval state. */
  mine: (page: PageParams, signal?: AbortSignal) =>
    api.get<Paged<HotelDto>>('/api/hotels/mine', { ...page }, signal),
  pending: (page: PageParams) => api.get<Paged<HotelDto>>('/api/hotels/pending', { ...page }),
  manage: (id: number) => api.get<HotelDto>(`/api/hotels/${id}/manage`),
  create: (body: CreateHotelRequest) => api.post<HotelDto>('/api/hotels', body),
  update: (id: number, body: UpdateHotelRequest) => api.put<HotelDto>(`/api/hotels/${id}`, body),
  delete: (id: number) => api.delete(`/api/hotels/${id}`),
  /** Admin: 400 unless the new owner is an active HotelOwner. */
  reassignOwner: (id: number, newOwnerId: string) => api.put<void>(`/api/hotels/${id}/owner`, { newOwnerId }),
  approve: (id: number) => api.post<void>(`/api/hotels/${id}/approve`),
  reject: (id: number, reason: string) => api.post<void>(`/api/hotels/${id}/reject`, { reason }),
  setAmenities: (id: number, amenityIds: number[]) =>
    api.put<void>(`/api/hotels/${id}/amenities`, { amenityIds }),
  /** Any approval state, ordered, with ids for removal. Admin or the hotel's owner. */
  images: (id: number) => api.get<ImageDto[]>(`/api/hotels/${id}/images`),
  addImage: (id: number, url: string) => api.post<{ imageId: number }>(`/api/hotels/${id}/images`, { url }),
  removeImage: (id: number, imageId: number) => api.delete(`/api/hotels/${id}/images/${imageId}`),
}
