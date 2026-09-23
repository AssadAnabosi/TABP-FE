import type { BookingStatus } from '@/api/types'
import { Badge } from '@/components/ui/badge'

const LABELS: Record<BookingStatus, string> = {
  Pending: 'Awaiting payment',
  Confirmed: 'Confirmed',
  CheckedIn: 'Checked in',
  CheckedOut: 'Checked out',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const variant = status === 'Pending' ? 'outline' : status === 'Confirmed' ? 'default' : 'secondary'
  return (
    <Badge
      variant={variant}
      className={status === 'Pending' ? 'border-amber-500 text-amber-700 dark:text-amber-400' : undefined}
    >
      {LABELS[status]}
    </Badge>
  )
}
