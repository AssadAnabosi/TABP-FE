// URL <-> search state (kickoff §7: keep all search state in the URL; shareable and back-button friendly).
import type { HotelSearchParams, IsoDate, RoomType } from '@/api/types'
import { ROOM_TYPES } from '@/api/types'
import { addDaysIso, defaultStay, parseIsoDate, todayIso } from '@/lib/dates'

export interface StayParams {
  checkIn: IsoDate
  checkOut: IsoDate
  adults: number
  children: number
  rooms: number
}

export interface SearchState extends StayParams {
  keyword?: string
  cityId?: number
  minPrice?: number
  maxPrice?: number
  minStarRating?: number
  amenityIds: number[]
  roomType?: RoomType
}

export const DEFAULT_GUESTS = { adults: 2, children: 0, rooms: 1 } as const

function int(value: string | null, min: number): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= min ? n : undefined
}

function num(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Reads the stay (dates + guests), falling back to today/tomorrow and 2/0/1 (brief 2.1). */
export function parseStay(params: URLSearchParams): StayParams {
  const defaults = defaultStay()
  let checkIn = parseIsoDate(params.get('checkIn')) ? params.get('checkIn')! : defaults.checkIn
  if (checkIn < todayIso()) checkIn = defaults.checkIn
  let checkOut = parseIsoDate(params.get('checkOut')) ? params.get('checkOut')! : addDaysIso(checkIn, 1)
  if (checkOut <= checkIn) checkOut = addDaysIso(checkIn, 1)
  return {
    checkIn,
    checkOut,
    adults: int(params.get('adults'), 1) ?? DEFAULT_GUESTS.adults,
    children: int(params.get('children'), 0) ?? DEFAULT_GUESTS.children,
    rooms: int(params.get('rooms'), 1) ?? DEFAULT_GUESTS.rooms,
  }
}

export function parseSearch(params: URLSearchParams): SearchState {
  const roomType = params.get('roomType') as RoomType | null
  const stars = int(params.get('minStarRating'), 1)
  return {
    ...parseStay(params),
    keyword: params.get('keyword')?.trim() || undefined,
    cityId: int(params.get('cityId'), 1),
    minPrice: num(params.get('minPrice')),
    maxPrice: num(params.get('maxPrice')),
    minStarRating: stars && stars <= 5 ? stars : undefined,
    amenityIds: params
      .getAll('amenityIds')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0),
    roomType: roomType && ROOM_TYPES.includes(roomType) ? roomType : undefined,
  }
}

/** Serializes state to URL params, omitting empty values. amenityIds repeat. */
export function toSearchParams(state: Partial<SearchState>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)))
    else params.set(key, String(value))
  }
  return params
}

/** Query string carried from search to the hotel page: dates + guests only (not filters or keyword). */
export function stayQuery(stay: Pick<StayParams, 'checkIn' | 'checkOut' | 'adults' | 'children'>): string {
  const { checkIn, checkOut, adults, children } = stay
  return toSearchParams({ checkIn, checkOut, adults, children }).toString()
}

/** The search request. The price filter is only sent when valid (maxPrice >= minPrice), else 400. */
export function toApiParams(state: SearchState): HotelSearchParams {
  const priceValid =
    state.minPrice === undefined || state.maxPrice === undefined || state.maxPrice >= state.minPrice
  return {
    keyword: state.keyword,
    cityId: state.cityId,
    checkIn: state.checkIn,
    checkOut: state.checkOut,
    adults: state.adults,
    children: state.children,
    rooms: state.rooms,
    minPrice: priceValid ? state.minPrice : undefined,
    maxPrice: priceValid ? state.maxPrice : undefined,
    minStarRating: state.minStarRating,
    amenityIds: state.amenityIds.length ? state.amenityIds : undefined,
    roomType: state.roomType,
  }
}
