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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface RoomFormDialogProps {
  hotelId: number
  /** null = create. */
  room: RoomDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RoomFormDialog({ hotelId, room, open, onOpenChange }: RoomFormDialogProps) {
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
  })
  const errors = form.formState.errors

  const save = useMutation({
    mutationFn: (values: Values) =>
      room
        ? // Only capacities are updatable (kickoff §9 G9: the number is immutable).
          roomsApi.update(room.id, {
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
      onOpenChange(false)
    },
    onError: (error) => setFormError(applyServerErrors(error, form.setError, FIELDS)),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset()
          setFormError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? `Edit room ${displayRoomNumber(room.number)}` : 'New room'}</DialogTitle>
          <DialogDescription>
            {room
              ? 'Room number, type and price are fixed once created; capacities can change.'
              : 'Add a room to this hotel.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id="room-form"
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
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="room-number"
              label="Number"
              error={errors.number?.message}
              hint={isCreate ? 'Unique within the hotel.' : undefined}
            >
              <Input
                readOnly={!isCreate}
                className={!isCreate ? 'bg-muted' : undefined}
                {...fieldA11y('room-number', errors.number?.message)}
                {...form.register('number')}
              />
            </FormField>
            <FormField id="room-type" label="Room type" error={errors.roomType?.message}>
              <Controller
                control={form.control}
                name="roomType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!isCreate}>
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
                readOnly={!isCreate}
                className={!isCreate ? 'bg-muted' : undefined}
                {...fieldA11y('room-price', errors.basePrice?.message)}
                {...form.register('basePrice')}
              />
            </FormField>
            <FormField id="room-currency" label="Currency" error={errors.currency?.message}>
              <Input
                maxLength={3}
                readOnly={!isCreate}
                className={!isCreate ? 'bg-muted uppercase' : 'uppercase'}
                {...fieldA11y('room-currency', errors.currency?.message)}
                {...form.register('currency')}
              />
            </FormField>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="room-form" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : room ? 'Save changes' : 'Create room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
