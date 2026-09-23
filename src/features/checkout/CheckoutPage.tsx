import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { usersApi } from '@/api/users'
import { useSession } from '@/auth/session'
import { cartItemKey, estimatedTotal, isStale, useCart } from '@/cart/cartStore'
import { FormField } from '@/components/FormField'
import { HotelImage } from '@/components/HotelImage'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatIsoDate, nightsBetween } from '@/lib/dates'
import { fieldA11y } from '@/lib/forms'
import { formatMoney, totalsByCurrency } from '@/lib/money'

import { cardSchema, mockCardToken, type CardInput, type CardValues } from './payment'
import { PaymentFields } from './PaymentFields'
import { useCheckout, type ItemStatus } from './useCheckout'

const guestSchema = z.object({
  firstName: z.string().trim().min(1, 'Required.').max(100),
  lastName: z.string().trim().min(1, 'Required.').max(100),
  email: z.string(),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[\d\s()-]{6,20}$/.test(v), 'Enter a valid phone number.'),
  specialRequests: z.string().max(1000, 'Keep it under 1000 characters.'),
  saveName: z.boolean(),
})
type GuestValues = z.infer<typeof guestSchema>

function StatusLine({ status }: { status: ItemStatus | undefined }) {
  if (!status || status.state === 'idle') return null
  if (status.state === 'reserving' || status.state === 'paying')
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden />{' '}
        {status.state === 'reserving' ? 'Reserving room…' : 'Processing payment…'}
      </p>
    )
  if (status.state === 'done')
    return (
      <p className="flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle2 className="size-3" aria-hidden /> Confirmed · {status.confirmationNumber}
      </p>
    )
  return (
    <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
      <CircleAlert className="size-3" aria-hidden /> {status.message}
    </p>
  )
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const user = useSession((s) => s.user)!
  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.remove)
  const { run, running, statuses } = useCheckout()
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const guest = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: '',
      specialRequests: '',
      saveName: false,
    },
  })
  const card = useForm<CardInput, unknown, CardValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { cardNumber: '', nameOnCard: '', expiry: '', cvc: '' },
  })

  const staleItems = items.filter(isStale)
  const payable = items.filter((i) => !isStale(i))
  const totals = totalsByCurrency(payable, estimatedTotal, (i) => i.currency)
  const [firstName, lastName, saveName] = useWatch({
    control: guest.control,
    name: ['firstName', 'lastName', 'saveName'],
  })
  const nameChanged = firstName !== user.firstName || lastName !== user.lastName
  const hasPendingRetry = payable.some((i) => i.bookingId)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSummaryError(null)
    const [guestOk, cardOk] = await Promise.all([guest.trigger(), card.trigger()])
    if (!guestOk || !cardOk) return
    const g = guestSchema.parse(guest.getValues())
    const c = cardSchema.parse(card.getValues())

    // Guest details aren't stored per booking (kickoff §9 G12); optionally update the profile name.
    if (g.saveName && nameChanged) {
      usersApi
        .updateProfile({ firstName: g.firstName, lastName: g.lastName })
        .catch(() => toast.error("Couldn't update your profile name."))
    }

    const result = await run(payable, {
      specialRequests: g.specialRequests.trim() || undefined,
      cardToken: mockCardToken(c),
    })

    if (result.failed === 0 && result.succeeded.length === 1) {
      navigate(`/bookings/${result.succeeded[0].bookingId}/confirmation`)
    } else if (result.failed === 0) {
      navigate('/bookings', { state: { justBooked: result.succeeded.map((s) => s.confirmationNumber) } })
    } else {
      setSummaryError(
        `${result.succeeded.length} of ${result.succeeded.length + result.failed} bookings completed. ` +
          'Rooms that were reserved but not paid stay held for you: fix the payment and submit again to retry payment only.',
      )
    }
  }

  if (items.length === 0 && !running) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Find a hotel and add a room to get started.</p>
        <Button asChild className="mt-6">
          <Link to="/">Browse hotels</Link>
        </Button>
      </div>
    )
  }

  const gErr = guest.formState.errors

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]"
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

        {summaryError && (
          <Alert variant="destructive">
            <AlertTitle>Some bookings didn't go through</AlertTitle>
            <AlertDescription>{summaryError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Guest details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="firstName" label="First name" error={gErr.firstName?.message}>
              <Input
                autoComplete="given-name"
                {...fieldA11y('firstName', gErr.firstName?.message)}
                {...guest.register('firstName')}
              />
            </FormField>
            <FormField id="lastName" label="Last name" error={gErr.lastName?.message}>
              <Input
                autoComplete="family-name"
                {...fieldA11y('lastName', gErr.lastName?.message)}
                {...guest.register('lastName')}
              />
            </FormField>
            <FormField id="email" label="Email" hint="Your confirmation is sent to your account email.">
              <Input readOnly {...fieldA11y('email')} {...guest.register('email')} className="bg-muted" />
            </FormField>
            <FormField id="phone" label="Phone (optional)" error={gErr.phone?.message}>
              <Input
                type="tel"
                autoComplete="tel"
                {...fieldA11y('phone', gErr.phone?.message)}
                {...guest.register('phone')}
              />
            </FormField>
            {nameChanged && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="saveName"
                  checked={saveName}
                  onCheckedChange={(v) => guest.setValue('saveName', v === true)}
                />
                <Label htmlFor="saveName" className="font-normal">
                  Save this name to my profile
                </Label>
              </div>
            )}
            <FormField
              id="specialRequests"
              label="Special requests (optional)"
              error={gErr.specialRequests?.message}
              className="sm:col-span-2"
            >
              <Textarea
                rows={3}
                placeholder="Late arrival, quiet room, extra pillows…"
                {...fieldA11y('specialRequests', gErr.specialRequests?.message)}
                {...guest.register('specialRequests')}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentFields register={card.register} setValue={card.setValue} errors={card.formState.errors} />
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {staleItems.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  {staleItems.length} item{staleItems.length === 1 ? ' has' : 's have'} a check-in date in the
                  past and can't be booked.{' '}
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    className="h-auto p-0"
                    onClick={() => staleItems.forEach((i) => removeItem(cartItemKey(i)))}
                  >
                    Remove
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <ul className="space-y-3">
              {payable.map((item) => {
                const key = cartItemKey(item)
                const nights = nightsBetween(item.checkIn, item.checkOut)
                return (
                  <li key={key} className="flex gap-3">
                    <HotelImage
                      src={item.thumbnailUrl}
                      alt={item.hotelName}
                      className="size-16 shrink-0 rounded-md"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium">{item.hotelName}</div>
                      <div className="text-muted-foreground">
                        {item.roomType} · {item.adults} adult{item.adults === 1 ? '' : 's'}
                        {item.children > 0 && `, ${item.children} child${item.children === 1 ? '' : 'ren'}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatIsoDate(item.checkIn)} – {formatIsoDate(item.checkOut)} · {nights} night
                        {nights === 1 ? '' : 's'}
                      </div>
                      <div className="mt-0.5 font-medium">
                        {formatMoney(estimatedTotal(item), item.currency)}
                        {!item.serverTotal && (
                          <span className="text-xs font-normal text-muted-foreground"> est.</span>
                        )}
                      </div>
                      {item.bookingId && !statuses[key] && (
                        <p className="text-xs text-amber-600">Reserved · awaiting payment</p>
                      )}
                      <StatusLine status={statuses[key]} />
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Total</span>
              <span className="text-right">
                {totals.map((t) => (
                  <div key={t.currency}>{formatMoney(t.total, t.currency)}</div>
                ))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Totals are estimates until each room is reserved. Submitting reserves each room and then charges
              your card. Bookings can't be cancelled online.
            </p>
            <Button type="submit" size="lg" className="w-full" disabled={running || payable.length === 0}>
              {running ? 'Processing…' : hasPendingRetry ? 'Retry payment' : 'Confirm and pay'}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </form>
  )
}
