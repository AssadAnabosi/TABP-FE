import { Navigate, useParams } from 'react-router'

import { useSession } from '@/auth/session'

import { navFor } from './nav'

/** /manage → the first page this role can use (Cities for admins, Hotels for owners). */
export function ManageIndex() {
  const role = useSession((s) => s.user?.role)
  const first = navFor(role)[0]
  return <Navigate to={first ? `/manage/${first.path}` : '/'} replace />
}

/** Old /admin/* links keep working: /admin/rooms?hotelId=3 → /manage/rooms?hotelId=3. */
export function LegacyAdminRedirect() {
  const rest = useParams()['*'] ?? ''
  return <Navigate to={`/manage/${rest}${window.location.search}`} replace />
}
