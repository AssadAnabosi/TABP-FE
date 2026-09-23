import type { RoomSummaryDto } from '@/api/types'

import type { StayParams } from '../search/searchParams'

/** RoomSummaryDto has no description (kickoff §9 G4), so compose one from type + capacity. */
export function describeRoom(
  room: Pick<RoomSummaryDto, 'roomType' | 'adultCapacity' | 'childCapacity'>,
): string {
  const adults = `${room.adultCapacity} adult${room.adultCapacity === 1 ? '' : 's'}`
  const children =
    room.childCapacity > 0 ? ` + ${room.childCapacity} child${room.childCapacity === 1 ? '' : 'ren'}` : ''
  return `${room.roomType} room · sleeps ${adults}${children}`
}

/** Why a room can't be added to the cart, or null when it can. */
export function unavailableReason(
  room: RoomSummaryDto,
  stay: Pick<StayParams, 'adults' | 'children'>,
): string | null {
  if (!room.isAvailable) return 'Not available for these dates.'
  if (stay.adults > room.adultCapacity || stay.children > room.childCapacity)
    return `Fits up to ${room.adultCapacity} adults and ${room.childCapacity} children.`
  return null
}
