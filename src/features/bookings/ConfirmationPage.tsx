import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Mail, Printer } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import { bookingsApi } from '@/api/bookings'
import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { hasRole, useSession } from '@/auth/session'
import { ErrorState, ForbiddenPage, NotFoundPage } from '@/components/StatusPages'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatIsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

import { PayDialog } from '../checkout/PayDialog'
import { BookingStatusBadge } from './BookingStatusBadge'
import { FrontDeskPanel } from './FrontDeskPanel'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

/** The PDF endpoint needs the Bearer header, so fetch it as a blob instead of linking to it (kickoff §8.7). */
async function downloadPdf(bookingId: string, confirmationNumber: string) {
  const blob = await bookingsApi.confirmationPdf(bookingId)
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `booking-${confirmationNumber}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function ConfirmationPage() {
  const bookingId = useParams().bookingId!
  const user = useSession((s) => s.user)
  // Staff may be viewing a guest's booking; the DTO doesn't say who booked it.
  const isStaff = hasRole(user, ['Admin', 'HotelOwner'])
  const [payOpen, setPayOpen] = useState(false)
  const booking = useQuery({
    queryKey: queryKeys.bookings.detail(bookingId),
    queryFn: () => bookingsApi.detail(bookingId),
  })
  const pdf = useMutation({ mutationFn: () => downloadPdf(bookingId, booking.data!.confirmationNumber) })

  if (booking.isError) {
    if (isApiError(booking.error) && (booking.error.status === 404 || booking.error.status === 400))
      return <NotFoundPage message="We couldn't find this booking." />
    if (isApiError(booking.error) && booking.error.status === 403) return <ForbiddenPage />
    return <ErrorState error={booking.error} onRetry={() => void booking.refetch()} />
  }
  if (booking.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const b = booking.data
  const isPending = b.status === 'Pending'
  const isCancelled = b.status === 'Cancelled'
  const heading = {
    Pending: { eyebrow: 'Reservation', title: 'Your room is reserved' },
    Confirmed: { eyebrow: 'Booking confirmed', title: 'Thanks, your stay is booked!' },
    CheckedIn: { eyebrow: 'Checked in', title: 'Enjoy your stay!' },
    CheckedOut: { eyebrow: 'Stay complete', title: 'Thanks for staying with us!' },
    Cancelled: { eyebrow: 'Booking', title: 'This booking was cancelled' },
  }[b.status]

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 print:max-w-none print:p-0">
      <Button asChild variant="ghost" size="sm" className="print:hidden">
        <Link to="/bookings">
          <ArrowLeft /> My bookings
        </Link>
      </Button>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{heading.eyebrow}</p>
        <h1 className="text-2xl font-bold tracking-tight">{heading.title}</h1>
      </div>

      {isCancelled ? null : isPending ? (
        <Alert className="print:hidden">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Payment hasn't been completed yet. The room stays held for you.</span>
            <Button size="sm" onClick={() => setPayOpen(true)}>
              Complete payment
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="print:hidden">
          <Mail aria-hidden />
          <AlertDescription>
            {isStaff ? (
              <>A confirmation with the invoice was emailed to the guest.</>
            ) : (
              <>
                A confirmation with your invoice has been sent to{' '}
                <strong>{user?.email ?? 'your email'}</strong>.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Confirmation #{b.confirmationNumber}</CardTitle>
            <p className="text-xs text-muted-foreground">Booked {formatDateTime(b.createdAt)}</p>
          </div>
          <BookingStatusBadge status={b.status} />
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label="Hotel">{b.hotelName}</Row>
            <Row label="Address">{b.hotelAddress}</Row>
            <Row label="Room">
              {b.roomType} · Room {b.roomNumber}
            </Row>
            <Row label="Guests">
              {b.adults} adult{b.adults === 1 ? '' : 's'}
              {b.children > 0 && `, ${b.children} child${b.children === 1 ? '' : 'ren'}`}
            </Row>
            <Row label="Check-in">{formatIsoDate(b.checkIn)}</Row>
            <Row label="Check-out">{formatIsoDate(b.checkOut)}</Row>
            <Row label="Nights">{b.nights}</Row>
            {b.specialRequests && (
              <Row label="Special requests">
                <span className="whitespace-pre-line">{b.specialRequests}</span>
              </Row>
            )}
            <Row label="Total price">
              <span className="text-lg">{formatMoney(b.totalPrice, b.currency)}</span>
            </Row>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
        <Button
          variant="outline"
          onClick={() => pdf.mutate()}
          disabled={pdf.isPending || isPending || isCancelled}
        >
          <Download /> {pdf.isPending ? 'Preparing PDF…' : 'Save as PDF'}
        </Button>
      </div>

      {isStaff && <FrontDeskPanel booking={b} />}

      {isPending && (
        <PayDialog
          bookingId={b.id}
          confirmationNumber={b.confirmationNumber}
          totalPrice={b.totalPrice}
          currency={b.currency}
          open={payOpen}
          onOpenChange={setPayOpen}
        />
      )}
    </div>
  )
}
