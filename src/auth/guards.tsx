import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import type { UserRole } from '@/api/types'
import { ForbiddenPage } from '@/components/StatusPages'

import { safeReturnTo } from './returnTo'
import { hasRole, useSession } from './session'

/** Redirects anonymous users to /login?returnTo=<current path>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status)
  const location = useLocation()
  if (status === 'anonymous') {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }
  return children
}

/** Shows a 403 page (not a redirect loop) when the signed-in user lacks the role. */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const user = useSession((s) => s.user)
  return <RequireAuth>{user && !hasRole(user, roles) ? <ForbiddenPage /> : children}</RequireAuth>
}

/** Login/register are for anonymous users only; signed-in users go to returnTo or home. */
export function AnonymousOnly({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status)
  const location = useLocation()
  if (status === 'authenticated') {
    return <Navigate to={safeReturnTo(new URLSearchParams(location.search).get('returnTo'))} replace />
  }
  return children
}
