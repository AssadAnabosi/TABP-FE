// API contract, hand-written from the backend DTOs (kickoff §11).
// Keep in sync with /swagger/v1/swagger.json when the backend changes.

// ---------- primitives ----------
export type Guid = string
export type IsoDate = string // "YYYY-MM-DD" (C# DateOnly)
export type IsoDateTime = string // ISO-8601 UTC (C# DateTime), sometimes without a trailing "Z"

export type UserRole = 'Customer' | 'HotelOwner' | 'Admin'
export type RoomType = 'Standard' | 'Budget' | 'Deluxe' | 'Suite' | 'Luxury' | 'Boutique'
export type DiscountType = 'Percentage' | 'FixedAmount'
export type HotelApprovalStatus = 'Pending' | 'Approved' | 'Rejected'
export type BookingStatus = 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled'
export const BOOKING_STATUSES: BookingStatus[] = [
  'Pending',
  'Confirmed',
  'CheckedIn',
  'CheckedOut',
  'Cancelled',
]

export const ROOM_TYPES: RoomType[] = ['Standard', 'Budget', 'Deluxe', 'Suite', 'Luxury', 'Boutique']

export interface Paged<T> {
  items: T[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface PageParams {
  pageNumber?: number
  pageSize?: number
}

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string | null
  traceId?: string
  errors?: Record<string, string[]> // PascalCase keys (kickoff §4.5)
}

// ---------- auth / users ----------
export interface LoginRequest {
  email: string
  password: string
}
export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}
export interface AuthResult {
  userId: Guid
  email: string
  firstName: string
  lastName: string
  role: UserRole
  accessToken: string
}
export interface UserProfileDto {
  id: Guid
  email: string
  firstName: string
  lastName: string
  role: UserRole
}
export interface UserListItemDto {
  id: Guid
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  createdAt: IsoDateTime
}

export interface UserDetailsDto extends UserListItemDto {
  modifiedAt: IsoDateTime | null
  ownedHotelsCount: number
  bookingsCount: number
}
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ---------- cities / amenities ----------
export interface CityDto {
  id: number
  name: string
  country: string
  postOffice: string
  thumbnailUrl: string | null
  hotelsCount: number
  createdAt: IsoDateTime
  modifiedAt: IsoDateTime | null
}
export interface CityRequest {
  name: string
  country: string
  postOffice: string
  /** Optional; absolute http(s) URL, max 2000 chars. */
  thumbnailUrl: string | null
}
export interface AmenityDto {
  id: number
  name: string
  createdAt: IsoDateTime
  modifiedAt: IsoDateTime | null
}

// ---------- hotels ----------
export interface HotelSearchParams extends PageParams {
  keyword?: string
  cityId?: number
  checkIn?: IsoDate
  checkOut?: IsoDate
  adults?: number
  children?: number
  rooms?: number
  minPrice?: number
  maxPrice?: number
  minStarRating?: number
  amenityIds?: number[]
  roomType?: RoomType
}
export interface HotelSearchResultDto {
  hotelId: number
  name: string
  cityName: string
  starRating: number
  thumbnailUrl: string | null
  pricePerNight: number
  currency: string
  shortDescription: string
}
export interface FeaturedDealDto {
  hotelId: number
  name: string
  cityName: string
  thumbnailUrl: string | null
  starRating: number
  originalPrice: number
  discountedPrice: number
  currency: string
}
export interface RoomSummaryDto {
  roomId: number
  roomType: RoomType
  adultCapacity: number
  childCapacity: number
  pricePerNight: number
  currency: string
  isAvailable: boolean
  imageUrls: string[]
}
export interface HotelDetailDto {
  id: number
  name: string
  starRating: number
  description: string
  address: string
  latitude: number
  longitude: number
  cityName: string
  averageRating: number
  reviewCount: number
  imageUrls: string[]
  amenities: string[]
  rooms: RoomSummaryDto[]
}
export interface HotelDto {
  id: number
  name: string
  starRating: number
  description: string
  address: string
  latitude: number
  longitude: number
  cityId: number
  cityName: string
  ownerId: Guid
  ownerName: string
  approvalStatus: HotelApprovalStatus
  rejectionReason: string | null
  roomsCount: number
  createdAt: IsoDateTime
  modifiedAt: IsoDateTime | null
}
export interface CreateHotelRequest {
  name: string
  starRating: number
  description: string
  address: string
  latitude: number
  longitude: number
  cityId: number
  ownerId: Guid | null // Admin: required (a HotelOwner user). HotelOwner: must be null.
}
export type UpdateHotelRequest = Omit<CreateHotelRequest, 'ownerId'>
/** Admin grid filters for GET /api/hotels (keyword matches name, address or city). */
export interface AdminHotelListParams extends PageParams {
  keyword?: string
  cityId?: number
  approvalStatus?: HotelApprovalStatus
  ownerId?: Guid
}

/** A gallery image with the id needed to remove it (hotels and rooms). */
export interface ImageDto {
  id: number
  url: string
  displayOrder: number
}

// ---------- visits ----------
export interface RecentlyVisitedDto {
  hotelId: number
  name: string
  cityName: string
  starRating: number
  thumbnailUrl: string | null
  pricePerNight: number
  currency: string
}
export interface TrendingCityDto {
  cityId: number
  cityName: string
  thumbnailUrl: string | null
  visitCount: number
}

// ---------- rooms ----------
export interface RoomDto {
  id: number
  hotelId: number
  number: string
  roomType: RoomType
  adultCapacity: number
  childCapacity: number
  basePrice: number
  currency: string
  isActive: boolean
  createdAt: IsoDateTime
  modifiedAt: IsoDateTime | null
}
export interface CreateRoomRequest {
  hotelId: number
  number: string
  roomType: RoomType
  adultCapacity: number
  childCapacity: number
  basePrice: number
  currency?: string // default "USD"
}
export interface UpdateRoomRequest {
  adultCapacity: number
  childCapacity: number
}
export interface BlockDatesRequest {
  startDate: IsoDate
  endDate: IsoDate
}

// ---------- discounts ----------
export const DISCOUNT_TYPES: DiscountType[] = ['Percentage', 'FixedAmount']
export interface DiscountDto {
  id: number
  roomId: number
  name: string
  type: DiscountType
  value: number
  startDate: IsoDate
  endDate: IsoDate
  isActive: boolean
  createdAt: IsoDateTime
  modifiedAt: IsoDateTime | null
}
export interface DiscountRequest {
  name: string
  type: DiscountType
  /** Percentage: 0 < value <= 100. FixedAmount: value > 0 (room currency). */
  value: number
  startDate: IsoDate
  endDate: IsoDate
}

// ---------- reviews ----------
export interface ReviewDto {
  id: number
  hotelId: number
  userId: Guid
  reviewerName: string
  rating: number
  comment: string | null
  createdAt: IsoDateTime
  modifiedAt: IsoDateTime | null
}

export interface ReviewRequest {
  rating: number
  comment: string | null
}

// ---------- bookings ----------
export interface CreateBookingRequest {
  roomId: number
  checkIn: IsoDate
  checkOut: IsoDate
  adults: number
  children: number
  specialRequests?: string | null
}
export interface CreateBookingResponse {
  bookingId: Guid
  confirmationNumber: string
  totalPrice: number
  currency: string
  status: BookingStatus
}
export interface ConfirmBookingRequest {
  cardToken: string
}
export interface BookingDto {
  id: Guid
  confirmationNumber: string
  status: BookingStatus
  totalPrice: number
  currency: string
  checkIn: IsoDate
  checkOut: IsoDate
}
export interface BookingListItemDto {
  id: Guid
  confirmationNumber: string
  hotelName: string
  roomNumber: string
  checkIn: IsoDate
  checkOut: IsoDate
  status: BookingStatus
  totalPrice: number
  currency: string
}
/** Filters for GET /api/hotels/{id}/bookings. Check-in dates are inclusive on both ends. */
export interface HotelBookingParams extends PageParams {
  status?: BookingStatus
  checkInFrom?: IsoDate
  checkInTo?: IsoDate
  /** Matches confirmation number, guest email, first name or last name. */
  keyword?: string
}
export interface HotelBookingListItemDto {
  id: Guid
  confirmationNumber: string
  guestId: Guid
  guestName: string
  guestEmail: string
  roomId: number
  /** Raw: a soft-deleted room carries a "::deleted::<guid>" suffix. */
  roomNumber: string
  checkIn: IsoDate
  checkOut: IsoDate
  adults: number
  children: number
  status: BookingStatus
  totalPrice: number
  currency: string
  specialRequests: string | null
  createdAt: IsoDateTime
}
export interface BookingDetailDto {
  id: Guid
  confirmationNumber: string
  status: BookingStatus
  hotelName: string
  hotelAddress: string
  roomNumber: string
  roomType: RoomType
  checkIn: IsoDate
  checkOut: IsoDate
  nights: number
  adults: number
  children: number
  totalPrice: number
  currency: string
  specialRequests: string | null
  createdAt: IsoDateTime
}
