import type { BookingDetailDto } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useFrontDesk } from './useFrontDesk'

const STATUS_NOTE: Partial<Record<BookingDetailDto['status'], string>> = {
  Pending: 'The guest has to complete payment before they can be checked in.',
  CheckedOut: 'This stay is complete.',
  Cancelled: 'This booking was cancelled.',
}

/** Front desk on a booking's page, shown to Admins and HotelOwners. */
export function FrontDeskPanel({ booking }: { booking: BookingDetailDto }) {
  const next = useFrontDesk(booking)

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-base">Front desk</CardTitle>
        <CardDescription>
          {STATUS_NOTE[booking.status] ?? "For the hotel's owner or an admin."}
        </CardDescription>
      </CardHeader>
      {next && (
        <CardContent>
          <Button onClick={next.run} disabled={next.pending}>
            <next.icon /> {next.pending ? 'Saving…' : `${next.label} guest`}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
