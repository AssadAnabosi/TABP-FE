import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { bookingsApi } from '@/api/bookings'
import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMoney } from '@/lib/money'

import { cardSchema, mockCardToken, type CardInput, type CardValues } from './payment'
import { PaymentFields } from './PaymentFields'

interface PayDialogProps {
  bookingId: string
  confirmationNumber: string
  totalPrice: number
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** "Complete payment" for a Pending booking: retries confirm only, never create (kickoff §8.6). */
export function PayDialog({
  bookingId,
  confirmationNumber,
  totalPrice,
  currency,
  open,
  onOpenChange,
}: PayDialogProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<CardInput, unknown, CardValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { cardNumber: '', nameOnCard: '', expiry: '', cvc: '' },
  })

  const pay = useMutation({
    mutationFn: (card: CardValues) => bookingsApi.confirm(bookingId, mockCardToken(card)),
    meta: { skipGlobalErrorToast: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
  })

  async function onSubmit(card: CardValues) {
    setError(null)
    try {
      await pay.mutateAsync(card)
      toast.success(`Booking ${confirmationNumber} confirmed.`)
      onOpenChange(false)
    } catch (e) {
      // 409 = no longer pending (already confirmed elsewhere): treat as success.
      if (isApiError(e) && e.status === 409) {
        toast.success(`Booking ${confirmationNumber} is already confirmed.`)
        onOpenChange(false)
      } else if (isApiError(e) && e.status === 402)
        setError(e.detail ?? 'Payment was declined. Try another card.')
      else setError(isApiError(e) ? e.userMessage : 'Payment failed.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete payment</DialogTitle>
          <DialogDescription>
            Booking {confirmationNumber} · {formatMoney(totalPrice, currency)}
          </DialogDescription>
        </DialogHeader>
        <form id="pay-form" onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <PaymentFields register={form.register} setValue={form.setValue} errors={form.formState.errors} />
        </form>
        <DialogFooter>
          <Button type="submit" form="pay-form" disabled={pay.isPending}>
            {pay.isPending ? 'Processing…' : `Pay ${formatMoney(totalPrice, currency)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
