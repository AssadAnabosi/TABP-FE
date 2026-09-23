import type { HotelDto } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const VARIANT = {
  Approved: 'default',
  Pending: 'outline',
  Rejected: 'destructive',
} as const

/** Approval status; a rejected hotel shows its rejection reason on hover/focus. */
export function ApprovalBadge({ hotel }: { hotel: Pick<HotelDto, 'approvalStatus' | 'rejectionReason'> }) {
  const badge = <Badge variant={VARIANT[hotel.approvalStatus]}>{hotel.approvalStatus}</Badge>
  if (hotel.approvalStatus !== 'Rejected' || !hotel.rejectionReason) return badge
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex">
          {badge}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">Reason: {hotel.rejectionReason}</TooltipContent>
    </Tooltip>
  )
}
