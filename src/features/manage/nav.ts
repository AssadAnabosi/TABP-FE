import { BedDouble, ConciergeBell, Hotel, MapPinned, Sparkles, Users, type LucideIcon } from 'lucide-react'

import type { UserRole } from '@/api/types'

export interface ManageNavItem {
  path: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
}

// Management area for Admins and HotelOwners. Each role sees what its API permissions allow (kickoff §6).
export const MANAGE_NAV: ManageNavItem[] = [
  { path: 'cities', label: 'Cities', icon: MapPinned, roles: ['Admin'] },
  { path: 'hotels', label: 'Hotels', icon: Hotel, roles: ['Admin', 'HotelOwner'] },
  { path: 'rooms', label: 'Rooms', icon: BedDouble, roles: ['Admin', 'HotelOwner'] },
  { path: 'bookings', label: 'Bookings', icon: ConciergeBell, roles: ['Admin', 'HotelOwner'] },
  { path: 'amenities', label: 'Amenities', icon: Sparkles, roles: ['Admin', 'HotelOwner'] },
  { path: 'users', label: 'Users', icon: Users, roles: ['Admin'] },
]

export const MANAGE_ROLES: UserRole[] = ['Admin', 'HotelOwner']

export function navFor(role: UserRole | undefined): ManageNavItem[] {
  return role ? MANAGE_NAV.filter((item) => item.roles.includes(role)) : []
}
