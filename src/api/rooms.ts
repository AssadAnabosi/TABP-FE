import { api } from './client'
import type { CreateRoomRequest, RoomDto, UpdateRoomRequest } from './types'

export const roomsApi = {
  /** Includes soft-deleted rooms (isActive: false, number "<n>::deleted::<guid>"). */
  byHotel: (hotelId: number) => api.get<RoomDto[]>(`/api/rooms/by-hotel/${hotelId}`),
  create: (body: CreateRoomRequest) => api.post<RoomDto>('/api/rooms', body),
  update: (id: number, body: UpdateRoomRequest) => api.put<RoomDto>(`/api/rooms/${id}`, body),
  /** Hard-deletes if never booked, soft-deletes otherwise. */
  delete: (id: number) => api.delete(`/api/rooms/${id}`),
}
