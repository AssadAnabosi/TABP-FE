import type { UserRole } from '@/api/types'

export const USER_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'Customer', label: 'Customer' },
  { value: 'HotelOwner', label: 'Hotel owner' },
  { value: 'Admin', label: 'Admin' },
]

export function roleLabel(role: UserRole): string {
  return USER_ROLES.find((r) => r.value === role)?.label ?? role
}
