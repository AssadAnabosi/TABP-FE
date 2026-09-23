import { api } from './client'
import type { RecentlyVisitedDto, TrendingCityDto } from './types'

export const visitsApi = {
  /** Public; counts toward "recently visited" when a token is attached. */
  record: (hotelId: number) => api.post<void>(`/api/hotel-visits/${hotelId}`),
  recentlyVisited: (count = 5) =>
    api.get<RecentlyVisitedDto[]>('/api/hotel-visits/recently-visited', { count }),
  trendingCities: (count = 5) => api.get<TrendingCityDto[]>('/api/hotel-visits/trending-cities', { count }),
}
