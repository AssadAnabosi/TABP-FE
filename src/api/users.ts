import { api } from './client'
import type { PageParams, Paged, UserListItemDto, UserProfileDto, UserRole } from './types'

export const usersApi = {
  list: (params: PageParams & { keyword?: string; role?: UserRole; isActive?: boolean }) =>
    api.get<Paged<UserListItemDto>>('/api/users', { ...params }),
  updateProfile: (body: { firstName: string; lastName: string }) =>
    api.put<UserProfileDto>('/api/users/profile', body),
}
