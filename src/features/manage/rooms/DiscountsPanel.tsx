import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { discountsApi } from '@/api/discounts'
import { queryKeys } from '@/api/queryKeys'
import { DISCOUNT_TYPES, type DiscountDto, type DiscountType, type RoomDto } from '@/api/types'
import { useSession } from '@/auth/session'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { addDaysIso, formatIsoDate, todayIso } from '@/lib/dates'
import { applyServerErrors, fieldA11y } from '@/lib/forms'
import { formatMoney } from '@/lib/money'

// Mirrors the backend Discount validators (name ≤150, value > 0, percentage ≤ 100, end after start).
const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(150),
    type: z.enum(DISCOUNT_TYPES as [DiscountType, ...DiscountType[]]),
    value: z.coerce.number<string | number>().positive('Must be greater than 0.'),
    startDate: z.string().min(1, 'Pick a start date.'),
    endDate: z.string().min(1, 'Pick an end date.'),
  })
  .refine((v) => v.type !== 'Percentage' || v.value <= 100, {
    path: ['value'],
    message: "A percentage can't exceed 100.",
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate > v.startDate, {
    path: ['endDate'],
    message: 'End date must be after the start date.',
  })
type Input = z.input<typeof schema>
type Values = z.output<typeof schema>
const FIELDS = ['name', 'type', 'value', 'startDate', 'endDate'] as const

const TYPE_LABEL: Record<DiscountType, string> = {
  Percentage: 'Percentage off',
  FixedAmount: 'Fixed amount off',
}

function describeDiscount(d: Pick<DiscountDto, 'type' | 'value'>, currency: string): string {
  return d.type === 'Percentage' ? `${d.value}% off` : `${formatMoney(d.value, currency)} off per night`
}

function DiscountForm({
  room,
  discount,
  onDone,
}: {
  room: RoomDto
  discount: DiscountDto | null
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const today = todayIso()
  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: discount?.name ?? '',
      type: discount?.type ?? 'Percentage',
      value: discount?.value ?? '',
      startDate: discount?.startDate ?? today,
      endDate: discount?.endDate ?? addDaysIso(today, 7),
    },
  })
  const errors = form.formState.errors
  const type = useWatch({ control: form.control, name: 'type' })

  const save = useMutation({
    mutationFn: (values: Values) =>
      discount ? discountsApi.update(discount.id, values) : discountsApi.create(room.id, values),
    meta: { skipGlobalErrorToast: true },
    onSuccess: (saved) => {
      toast.success(discount ? `Discount "${saved.name}" updated.` : `Discount "${saved.name}" created.`)
      void queryClient.invalidateQueries({ queryKey: queryKeys.discounts.byRoom(room.id) })
      // Prices and featured deals depend on active discounts.
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
      onDone()
    },
    onError: (error) => setFormError(applyServerErrors(error, form.setError, FIELDS)),
  })

  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border p-3"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        save.mutate(values)
      })}
    >
      <h4 className="text-sm font-medium">{discount ? `Edit "${discount.name}"` : 'New discount'}</h4>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <FormField id="discount-name" label="Name" error={errors.name?.message}>
        <Input
          placeholder="e.g. Summer sale"
          {...fieldA11y('discount-name', errors.name?.message)}
          {...form.register('name')}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField id="discount-type" label="Type" error={errors.type?.message}>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="discount-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          id="discount-value"
          label={type === 'Percentage' ? 'Percent (1–100)' : `Amount (${room.currency})`}
          error={errors.value?.message}
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            {...fieldA11y('discount-value', errors.value?.message)}
            {...form.register('value')}
          />
        </FormField>
        <FormField id="discount-start" label="Starts" error={errors.startDate?.message}>
          <Input
            type="date"
            {...fieldA11y('discount-start', errors.startDate?.message)}
            {...form.register('startDate')}
          />
        </FormField>
        <FormField id="discount-end" label="Ends" error={errors.endDate?.message}>
          <Input
            type="date"
            {...fieldA11y('discount-end', errors.endDate?.message)}
            {...form.register('endDate')}
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : discount ? 'Save discount' : 'Create discount'}
        </Button>
      </div>
    </form>
  )
}

/** A room's discounts. Creating/changing them is HotelOwner-only; Admins can view (kickoff §6). */
export function DiscountsPanel({ room }: { room: RoomDto }) {
  const queryClient = useQueryClient()
  const canEdit = useSession((s) => s.user?.role === 'HotelOwner')
  const [editing, setEditing] = useState<DiscountDto | 'new' | null>(null)
  const [deleting, setDeleting] = useState<DiscountDto | null>(null)

  const discounts = useQuery({
    queryKey: queryKeys.discounts.byRoom(room.id),
    queryFn: () => discountsApi.byRoom(room.id),
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.discounts.byRoom(room.id) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
  }
  const deactivate = useMutation({
    mutationFn: (d: DiscountDto) => discountsApi.deactivate(d.id),
    onSuccess: (_, d) => {
      toast.success(`Discount "${d.name}" deactivated.`)
      refresh()
    },
  })
  const remove = useMutation({
    mutationFn: (d: DiscountDto) => discountsApi.delete(d.id),
    onSuccess: (_, d) => {
      toast.success(`Discount "${d.name}" deleted.`)
      setDeleting(null)
      refresh()
    },
    onError: () => setDeleting(null),
  })

  return (
    <div className="space-y-3">
      {!canEdit && (
        <Alert>
          <AlertDescription>Only the hotel's owner can create or change discounts.</AlertDescription>
        </Alert>
      )}

      {discounts.isPending && <Skeleton className="h-16 w-full" />}
      {discounts.isError && <p className="text-sm text-muted-foreground">Couldn't load discounts.</p>}
      {discounts.data?.length === 0 && editing === null && (
        <p className="text-sm text-muted-foreground">This room has no discounts.</p>
      )}

      <ul className="space-y-2">
        {discounts.data?.map((d) =>
          editing !== 'new' && editing?.id === d.id ? (
            <li key={d.id}>
              <DiscountForm room={room} discount={d} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{d.name}</span>
                  <Badge variant={d.isActive ? 'default' : 'secondary'}>
                    {d.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {describeDiscount(d, room.currency)} · {formatIsoDate(d.startDate)} –{' '}
                  {formatIsoDate(d.endDate)}
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${d.name}`}
                    onClick={() => setEditing(d)}
                  >
                    <Pencil />
                  </Button>
                  {d.isActive && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Deactivate ${d.name}`}
                      title="Deactivate"
                      disabled={deactivate.isPending}
                      onClick={() => deactivate.mutate(d)}
                    >
                      <Power />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => setDeleting(d)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ),
        )}
      </ul>

      {canEdit &&
        (editing === 'new' ? (
          <DiscountForm room={room} discount={null} onDone={() => setEditing(null)} />
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
            <Plus /> Add discount
          </Button>
        ))}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="This permanently removes the discount. To pause it instead, deactivate it."
        confirmLabel="Delete discount"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  )
}
