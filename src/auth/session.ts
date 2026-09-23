// Session store (kickoff §5.3). Mirrors the in-memory token held by the API client.
import { create } from 'zustand'

import { authApi } from '@/api/auth'
import { applyAuthResult, onSessionChange, refreshSession } from '@/api/client'
import type { AuthResult, LoginRequest, RegisterRequest, UserRole } from '@/api/types'
import { queryClient } from '@/lib/queryClient'

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

type Status = 'loading' | 'authenticated' | 'anonymous'

interface SessionState {
  status: Status
  user: SessionUser | null
}

export const useSession = create<SessionState>(() => ({ status: 'loading', user: null }))

function toUser(result: AuthResult): SessionUser {
  // Use the role from the response body, not the JWT claim (kickoff §5.1).
  return {
    id: result.userId,
    email: result.email,
    firstName: result.firstName,
    lastName: result.lastName,
    role: result.role,
  }
}

// Keep the store in sync with every token change (login, refresh, forced logout on refresh failure).
onSessionChange((result) => {
  useSession.setState(
    result ? { status: 'authenticated', user: toUser(result) } : { status: 'anonymous', user: null },
  )
})

// Multi-tab: a logout in one tab logs out the others (the refresh cookie is already revoked).
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tabp-session') : null
channel?.addEventListener('message', (event: MessageEvent<string>) => {
  if (event.data === 'logout' && useSession.getState().status === 'authenticated') {
    applyAuthResult(null)
    queryClient.clear()
  }
})

let bootPromise: Promise<void> | null = null

/** App boot: one refresh attempt restores the session from the cookie. Guarded so StrictMode can't double-fire. */
export function bootstrapSession(): Promise<void> {
  bootPromise ??= refreshSession().then(() => undefined)
  return bootPromise
}

export async function login(body: LoginRequest): Promise<SessionUser> {
  const result = await authApi.login(body)
  applyAuthResult(result)
  return toUser(result)
}

export async function register(body: RegisterRequest): Promise<SessionUser> {
  const result = await authApi.register(body)
  applyAuthResult(result)
  return toUser(result)
}

export async function logout(): Promise<void> {
  try {
    await authApi.logout()
  } catch {
    // Logout never fails for a missing cookie; any other error still ends the local session.
  }
  applyAuthResult(null)
  queryClient.clear()
  channel?.postMessage('logout')
}

export function hasRole(user: SessionUser | null, roles: UserRole[]): boolean {
  return !!user && roles.includes(user.role)
}
