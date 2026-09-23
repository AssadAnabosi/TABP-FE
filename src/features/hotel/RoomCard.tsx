import { Check, ChevronLeft, ChevronRight, ShoppingCart, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import type { HotelDetailDto, RoomSummaryDto } from '@/api/types'
import { cartItemKey, useCart } from '@/cart/cartStore'
import { HotelImage } from '@/components/HotelImage'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { nightsBetween } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

import type { StayParams } from '../search/searchParams'
import { describeRoom, unavailableReason } from './roomRules'

function RoomImages({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0)
  return (
    <div className="relative">
      <HotelImage src={images[index]} alt={`${alt} photo ${index + 1}`} className="aspect-[4/3] w-full" />
      {images.length > 1 && (
        <>
          <Button
            variant="secondary"
            size="icon-xs"
            className="absolute top-1/2 left-2 -translate-y-1/2 opacity-90"
            aria-label="Previous room photo"
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon-xs"
            className="absolute top-1/2 right-2 -translate-y-1/2 opacity-90"
            aria-label="Next room photo"
            onClick={() => setIndex((i) => (i + 1) % images.length)}
          >
            <ChevronRight />
          </Button>
        </>
      )}
    </div>
  )
}

interface RoomCardProps {
  hotel: HotelDetailDto
  room: RoomSummaryDto
  stay: StayParams
  /** True while availability for newly picked dates is still loading. */
  updating?: boolean
}

export function RoomCard({ hotel, room, stay, updating }: RoomCardProps) {
  const add = useCart((s) => s.add)
  const key = cartItemKey({ roomId: room.roomId, checkIn: stay.checkIn, checkOut: stay.checkOut })
  const inCart = useCart((s) => s.items.some((i) => cartItemKey(i) === key))
  const nights = nightsBetween(stay.checkIn, stay.checkOut)
  const reason = unavailableReason(room, stay)

  function addToCart() {
    const added = add({
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelAddress: hotel.address,
      cityName: hotel.cityName,
      roomId: room.roomId,
      roomType: room.roomType,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: stay.adults,
      children: stay.children,
      pricePerNight: room.pricePerNight,
      currency: room.currency,
      thumbnailUrl: room.imageUrls[0] ?? hotel.imageUrls[0] ?? null,
    })
    if (added) toast.success(`${room.roomType} room added to your cart.`)
  }

  const button = (
    <Button className="w-full" disabled={!!reason || inCart || updating} onClick={addToCart}>
      {inCart ? (
        <>
          <Check /> In your cart
        </>
      ) : (
        <>
          <ShoppingCart /> Add to cart
        </>
      )}
    </Button>
  )

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <RoomImages images={room.imageUrls} alt={`${room.roomType} room`} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-semibold">{room.roomType}</h3>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="size-3.5" aria-hidden /> {describeRoom(room)}
          </p>
        </div>
        <div className="mt-auto">
          <div>
            <span className="text-xl font-semibold">{formatMoney(room.pricePerNight, room.currency)}</span>
            <span className="text-sm text-muted-foreground"> / night</span>
          </div>
          <div className="text-xs text-muted-foreground">
            ≈ {formatMoney(room.pricePerNight * nights, room.currency)} for {nights} night
            {nights === 1 ? '' : 's'} (estimate)
          </div>
        </div>
        {reason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* A disabled button swallows pointer events; the wrapper keeps the tooltip reachable. */}
              <span tabIndex={0} className="block rounded-lg">
                {button}
              </span>
            </TooltipTrigger>
            <TooltipContent>{reason}</TooltipContent>
          </Tooltip>
        ) : (
          button
        )}
        {reason && <p className="text-xs text-muted-foreground sm:hidden">{reason}</p>}
      </div>
    </article>
  )
}
