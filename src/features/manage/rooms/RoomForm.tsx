import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { queryKeys } from '@/api/queryKeys'
import { roomsApi } from '@/api/rooms'
import { ROOM_TYPES, type RoomDto, type RoomType } from '@/api/types'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors, fieldA11y } from '@/lib/forms'

import { displayRoomNumber } from './roomNumber'

// Mirrors the backend Room validator (kickoff §12).
const schema = z.object({
  number: z.string().trim().min(1, 'Room number is required.').max(20),
  roomType: z.enum(ROOM_TYPES as [RoomType, ...RoomType[]]),
  adultCapacity: z.coerce.number<string | number>().int('Whole number.').min(1, 'At least 1 adult.'),
  childCapacity: z.coerce.number<string | number>().int('Whole number.').min(0, "Can't be negative."),
  basePrice: z.coerce.number<string | number>().positive('Must be greater than 0.'),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, '3-letter code, e.g. USD.')
    .transform((v) => v.toUpperCase()),
})
type Input = z.input<typeof schema>
type Values = z.output<typeof schema>
const FIELDS = ['number', 'roomType', 'adultCapacity', 'childCapacity', 'basePrice', 'currency'] as const

interface RoomFormProps {
  hotelId: number
  /** null = create. */
  room: RoomDto | null
  onDone: () => void
}

/**
 * Create a room, or update one. Only capacities are updatable: number, type, price and currency are
 * fixed once created (kickoff §9 G9).
 */
export function RoomForm({ hotelId, room, onDone }: RoomFormProps) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const isCreate = room === null

  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    values: {
      number: room ? displayRoomNumber(room.number) : '',
      roomType: room?.roomType ?? 'Standard',
      adultCapacity: room?.adultCapacity ?? 2,
      childCapacity: room?.childCapacity ?? 0,
      basePrice: room?.basePrice ?? '',
      currency: room?.currency ?? 'USD',
    },
    resetOptions: { keepDirtyValues: true },
  })
  const errors = form.formState.errors

  const save = useMutation({
    mutationFn: (values: Values) =>
      room
        ? roomsApi.update(room.id, {
            adultCapacity: values.adultCapacity,
            childCapacity: values.childCapacity,
          })
        : roomsApi.create({ hotelId, ...values }),
    meta: { skipGlobalErrorToast: true },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.byHotel(hotelId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all }) // roomsCount changed
      toast.success(
        room ? `Room ${displayRoomNumber(saved.number)} updated.` : `Room ${saved.number} created.`,
      )
      form.reset()
      onDone()
    },
    onError: (error) => setFormError(applyServerErrors(error, form.setError, FIELDS)),
  })

  const fixed = !isCreate // fields that can't change after creation
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        save.mutate(values)
      })}
    >
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {fixed && (
        <p className="text-xs text-muted-foreground">
          Room number, type, price and currency are fixed once created; capacities can change.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="room-number"
          label="Number"
          error={errors.number?.message}
          hint={isCreate ? 'Unique within the hotel.' : undefined}
        >
          <Input
            readOnly={fixed}
            className={fixed ? 'bg-muted' : undefined}
            {...fieldA11y('room-number', errors.number?.message)}
            {...form.register('number')}
          />
        </FormField>
        <FormField id="room-type" label="Room type" error={errors.roomType?.message}>
          <Controller
            control={form.control}
            name="roomType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={fixed}>
                <SelectTrigger id="room-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="room-adults" label="Adult capacity" error={errors.adultCapacity?.message}>
          <Input
            type="number"
            min={1}
            {...fieldA11y('room-adults', errors.adultCapacity?.message)}
            {...form.register('adultCapacity')}
          />
        </FormField>
        <FormField id="room-children" label="Child capacity" error={errors.childCapacity?.message}>
          <Input
            type="number"
            min={0}
            {...fieldA11y('room-children', errors.childCapacity?.message)}
            {...form.register('childCapacity')}
          />
        </FormField>
        <FormField id="room-price" label="Base price / night" error={errors.basePrice?.message}>
          <Input
            type="number"
            min={0}
            step="0.01"
            readOnly={fixed}
            className={fixed ? 'bg-muted' : undefined}
            {...fieldA11y('room-price', errors.basePrice?.message)}
            {...form.register('basePrice')}
          />
        </FormField>
        <FormField id="room-currency" label="Currency" error={errors.currency?.message}>
          <Input
            maxLength={3}
            readOnly={fixed}
            className={fixed ? 'bg-muted uppercase' : 'uppercase'}
            {...fieldA11y('room-currency', errors.currency?.message)}
            {...form.register('currency')}
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : isCreate ? 'Create room' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
