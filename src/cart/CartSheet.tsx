import { ShoppingCart, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { HotelImage } from '@/components/HotelImage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { formatIsoDate, nightsBetween } from '@/lib/dates'
import { formatMoney, totalsByCurrency } from '@/lib/money'

import { cartItemKey, estimatedTotal, isStale, useCart } from './cartStore'

/** Header cart icon + drawer (kickoff §8.5). Checkout requires login; the /checkout guard handles it. */
export function CartSheet() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const items = useCart((s) => s.items)
  const remove = useCart((s) => s.remove)
  const bookable = items.filter((i) => !isStale(i))
  const totals = totalsByCurrency(bookable, estimatedTotal, (i) => i.currency)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Cart, ${items.length} item${items.length === 1 ? '' : 's'}`}
        >
          <ShoppingCart />
          {items.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>Rooms are reserved when you check out.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {items.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</p>
          )}
          {items.map((item) => {
            const key = cartItemKey(item)
            const nights = nightsBetween(item.checkIn, item.checkOut)
            const stale = isStale(item)
            return (
              <div key={key} className="flex gap-3 rounded-lg border p-2">
                <HotelImage
                  src={item.thumbnailUrl}
                  alt={item.hotelName}
                  className="size-20 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1 text-sm">
                  <Link
                    to={`/hotels/${item.hotelId}`}
                    onClick={() => setOpen(false)}
                    className="font-medium hover:underline"
                  >
                    {item.hotelName}
                  </Link>
                  <div className="text-muted-foreground">{item.roomType} room</div>
                  <div className="text-xs text-muted-foreground">
                    {formatIsoDate(item.checkIn)} – {formatIsoDate(item.checkOut)} · {nights} night
                    {nights === 1 ? '' : 's'}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-medium">{formatMoney(estimatedTotal(item), item.currency)}</span>
                    {stale && <Badge variant="destructive">Dates passed</Badge>}
                    {item.bookingId && <Badge variant="secondary">Awaiting payment</Badge>}
                  </div>
                </div>
                {!item.bookingId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.hotelName} ${item.roomType}`}
                    onClick={() => remove(key)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {items.length > 0 && (
          <SheetFooter className="border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="text-right font-semibold">
                {totals.map((t) => (
                  <div key={t.currency}>{formatMoney(t.total, t.currency)}</div>
                ))}
              </span>
            </div>
            <Button
              disabled={bookable.length === 0}
              onClick={() => {
                setOpen(false)
                navigate('/checkout')
              }}
            >
              Proceed to checkout
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
