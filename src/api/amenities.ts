import { api } from './client'
import type { AmenityDto } from './types'

export const amenitiesApi = {
  list: () => api.get<AmenityDto[]>('/api/amenities'),
}
