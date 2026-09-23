import { api } from './client'
import type { DiscountDto, DiscountRequest } from './types'

// Create/update/deactivate/delete are HotelOwner-only (an Admin can only read).
export const discountsApi = {
  byRoom: (roomId: number) => api.get<DiscountDto[]>(`/api/discounts/by-room/${roomId}`),
  create: (roomId: number, body: DiscountRequest) =>
    api.post<DiscountDto>('/api/discounts', { roomId, ...body }),
  update: (id: number, body: DiscountRequest) => api.put<DiscountDto>(`/api/discounts/${id}`, body),
  deactivate: (id: number) => api.post<void>(`/api/discounts/${id}/deactivate`),
  delete: (id: number) => api.delete(`/api/discounts/${id}`),
}
