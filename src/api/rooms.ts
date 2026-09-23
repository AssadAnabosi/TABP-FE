import { api } from './client'
import type { BlockDatesRequest, CreateRoomRequest, ImageDto, RoomDto, UpdateRoomRequest } from './types'

export const roomsApi = {
  /** Includes soft-deleted rooms (isActive: false, number "<n>::deleted::<guid>"). */
  byHotel: (hotelId: number) => api.get<RoomDto[]>(`/api/rooms/by-hotel/${hotelId}`),
  create: (body: CreateRoomRequest) => api.post<RoomDto>('/api/rooms', body),
  update: (id: number, body: UpdateRoomRequest) => api.put<RoomDto>(`/api/rooms/${id}`, body),
  /** Hard-deletes if never booked, soft-deletes otherwise. */
  delete: (id: number) => api.delete(`/api/rooms/${id}`),
  /** Ordered by display order, with ids for removal. Admin or the hotel's owner. */
  images: (id: number) => api.get<ImageDto[]>(`/api/rooms/${id}/images`),
  addImage: (id: number, url: string) => api.post<{ imageId: number }>(`/api/rooms/${id}/images`, { url }),
  removeImage: (id: number, imageId: number) => api.delete(`/api/rooms/${id}/images/${imageId}`),
  /** 409 if it overlaps a booking or an existing block. Blocks can't be listed later (kickoff §9 G8). */
  blockDates: (id: number, body: BlockDatesRequest) =>
    api.post<{ availabilityId: number }>(`/api/rooms/${id}/availability/block`, body),
  unblockDates: (id: number, availabilityId: number) =>
    api.delete(`/api/rooms/${id}/availability/${availabilityId}`),
}
