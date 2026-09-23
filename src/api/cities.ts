import { api } from './client'
import type { CityDto, CityRequest, PageParams, Paged } from './types'

export const citiesApi = {
  list: (params: PageParams & { keyword?: string }) => api.get<Paged<CityDto>>('/api/cities', { ...params }),
  get: (id: number) => api.get<CityDto>(`/api/cities/${id}`),
  create: (body: CityRequest) => api.post<CityDto>('/api/cities', body),
  update: (id: number, body: CityRequest) => api.put<CityDto>(`/api/cities/${id}`, body),
  /** 409 when the city still has hotels. */
  delete: (id: number) => api.delete(`/api/cities/${id}`),
}
