import { api, request } from './client'
import type {
  ChangePasswordRequest,
  Guid,
  PageParams,
  Paged,
  UserDetailsDto,
  UserListItemDto,
  UserProfileDto,
  UserRole,
} from './types'

export const usersApi = {
  list: (params: PageParams & { keyword?: string; role?: UserRole; isActive?: boolean }) =>
    api.get<Paged<UserListItemDto>>('/api/users', { ...params }),
  get: (id: Guid) => api.get<UserDetailsDto>(`/api/users/${id}`),
  updateProfile: (body: { firstName: string; lastName: string }) =>
    api.put<UserProfileDto>('/api/users/profile', body),
  /** 401 when the current password is wrong. */
  changePassword: (body: ChangePasswordRequest) =>
    request<void>('/api/users/password', { method: 'PUT', body, refreshOn401: false }),
  /** Admin. An admin can't demote themselves (403). Takes effect on the user's next login/refresh. */
  setRole: (userId: Guid, newRole: UserRole) => api.put<void>('/api/users/role', { userId, newRole }),
  /** Admin. An admin can't deactivate themselves (403). */
  setActive: (userId: Guid, isActive: boolean) => api.put<void>('/api/users/status', { userId, isActive }),
}
