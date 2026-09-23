import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { isApiError } from '@/api/errors'
import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { HotelDto } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_REASON = 1000

/**
 * Admin approval workflow. Approve is allowed from Pending or Rejected (409 once Approved);
 * Reject is offered for Pending hotels, as documented by the API. The owner is emailed the reason.
 */
export function HotelApprovalActions({ hotel }: { hotel: HotelDto }) {
  const queryClient = useQueryClient()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
  }

  const approve = useMutation({
    mutationFn: () => hotelsApi.approve(hotel.id),
    onSuccess: () => {
      toast.success(`${hotel.name} approved and now publicly listed.`)
      refresh()
    },
    onError: refresh, // e.g. 409 when someone else approved it first; the toast shows the server's reason.
  })

  const reject = useMutation({
    mutationFn: (text: string) => hotelsApi.reject(hotel.id, text),
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      toast.success(`${hotel.name} rejected. The owner has been emailed the reason.`)
      setRejectOpen(false)
      setReason('')
      refresh()
    },
    onError: (error) =>
      setReasonError(
        isApiError(error) ? (error.fieldErrors.reason ?? error.userMessage) : 'Could not reject the hotel.',
      ),
  })

  const canApprove = hotel.approvalStatus !== 'Approved'
  const canReject = hotel.approvalStatus === 'Pending'
  if (!canApprove && !canReject) return null

  return (
    <div className="flex flex-wrap gap-2">
      {canApprove && (
        <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
          <Check /> {approve.isPending ? 'Approving…' : 'Approve'}
        </Button>
      )}
      {canReject && (
        <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
          <X /> Reject
        </Button>
      )}

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open)
          if (!open) setReasonError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {hotel.name}?</DialogTitle>
            <DialogDescription>
              The owner is emailed this reason. Editing the listing resubmits it for approval.
            </DialogDescription>
          </DialogHeader>
          <form
            id="reject-form"
            noValidate
            className="grid gap-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              const text = reason.trim()
              if (!text) return setReasonError('Give the owner a reason.')
              if (text.length > MAX_REASON) return setReasonError(`Keep it under ${MAX_REASON} characters.`)
              setReasonError(null)
              reject.mutate(text)
            }}
          >
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={reasonError ? 'reject-reason-error' : undefined}
              placeholder="e.g. Photos are missing and the address couldn't be verified."
            />
            <div className="flex justify-between text-xs">
              <span id="reject-reason-error" role="alert" className="text-destructive">
                {reasonError}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {reason.trim().length}/{MAX_REASON}
              </span>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="reject-form" variant="destructive" disabled={reject.isPending}>
              {reject.isPending ? 'Rejecting…' : 'Reject hotel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
