import { api, request } from './client'
import type { AuthResult, LoginRequest, RegisterRequest, UserProfileDto } from './types'

export const authApi = {
  login: (body: LoginRequest) =>
    request<AuthResult>('/api/auth/login', { method: 'POST', body, auth: false }),
  register: (body: RegisterRequest) =>
    request<AuthResult>('/api/auth/register', { method: 'POST', body, auth: false }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST', auth: false }),
  /** Current user. Rate-limited with the auth endpoints: fetch once, never poll (kickoff §4.8). */
  me: () => api.get<UserProfileDto>('/api/auth'),
}
