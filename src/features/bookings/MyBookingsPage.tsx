import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'

import { bookingsApi } from '@/api/bookings'
import { queryKeys } from '@/api/queryKeys'
import type { BookingListItemDto } from '@/api/types'
import { ErrorState } from '@/components/StatusPages'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatIsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

import { PayDialog } from '../checkout/PayDialog'
import { BookingStatusBadge } from './BookingStatusBadge'

const PAGE_SIZE = 10

export function MyBookingsPage() {
  const [page, setPage] = useState(1)
  const [paying, setPaying] = useState<BookingListItemDto | null>(null)
  const justBooked = (useLocation().state as { justBooked?: string[] } | null)?.justBooked
  const bookings = useQuery({
    queryKey: queryKeys.bookings.mine(page),
    queryFn: () => bookingsApi.mine({ pageNumber: page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">My bookings</h1>

      {justBooked && justBooked.length > 0 && (
        <Alert>
          <CheckCircle2 aria-hidden />
          <AlertDescription>
            All set! Booked {justBooked.length} room{justBooked.length === 1 ? '' : 's'}:{' '}
            {justBooked.join(', ')}. Confirmation emails are on their way.
          </AlertDescription>
        </Alert>
      )}

      {bookings.isError && <ErrorState error={bookings.error} onRetry={() => void bookings.refetch()} />}
      {bookings.isPending &&
        Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      {bookings.data?.items.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No bookings yet.</p>
          <Button asChild className="mt-4">
            <Link to="/">Find a hotel</Link>
          </Button>
        </div>
      )}

      <ul className="space-y-3">
        {bookings.data?.items.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{b.hotelName}</span>
                <BookingStatusBadge status={b.status} />
              </div>
              <div className="text-sm text-muted-foreground">
                Room {b.roomNumber} · {formatIsoDate(b.checkIn)} – {formatIsoDate(b.checkOut)}
              </div>
              <div className="text-xs text-muted-foreground">#{b.confirmationNumber}</div>
            </div>
            <div className="text-right font-semibold">{formatMoney(b.totalPrice, b.currency)}</div>
            <div className="flex gap-2">
              {b.status === 'Pending' && (
                <Button size="sm" onClick={() => setPaying(b)}>
                  Complete payment
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to={`/bookings/${b.id}/confirmation`}>View</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {bookings.data && bookings.data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!bookings.data.hasPreviousPage}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {bookings.data.pageNumber} of {bookings.data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!bookings.data.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {paying && (
        <PayDialog
          bookingId={paying.id}
          confirmationNumber={paying.confirmationNumber}
          totalPrice={paying.totalPrice}
          currency={paying.currency}
          open
          onOpenChange={(open) => !open && setPaying(null)}
        />
      )}
    </div>
  )
}
