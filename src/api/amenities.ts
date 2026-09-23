import { api } from './client'
import type { AmenityDto } from './types'

export const amenitiesApi = {
  list: () => api.get<AmenityDto[]>('/api/amenities'),
  create: (name: string) => api.post<AmenityDto>('/api/amenities', { name }),
  update: (id: number, name: string) => api.put<AmenityDto>(`/api/amenities/${id}`, { name }),
  /** 409 while the amenity is assigned to any hotel. */
  delete: (id: number) => api.delete(`/api/amenities/${id}`),
}
