import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { citiesApi } from '@/api/cities'
import { ApiError, isApiError } from '@/api/errors'
import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { HotelDto } from '@/api/types'
import { usersApi } from '@/api/users'
import { useSession } from '@/auth/session'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors, fieldA11y } from '@/lib/forms'

const LocationPicker = lazy(() => import('./LocationPicker'))

// Mirrors the backend Hotel validator (kickoff §12).
const schema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  starRating: z.coerce.number<string | number>().int().min(1).max(5),
  description: z.string().max(4000, 'Keep it under 4000 characters.'),
  address: z.string().trim().min(1, 'Address is required.').max(300),
  cityId: z.coerce.number<string | number>().int().positive('Pick a city.'),
  latitude: z.coerce.number<string | number>().min(-90, 'Between −90 and 90.').max(90, 'Between −90 and 90.'),
  longitude: z.coerce
    .number<string | number>()
    .min(-180, 'Between −180 and 180.')
    .max(180, 'Between −180 and 180.'),
  ownerId: z.string(),
})
// An admin must always pick an owner who holds the HotelOwner role; an owner never sends one.
const adminSchema = schema.refine((v) => v.ownerId !== '', { path: ['ownerId'], message: 'Pick an owner.' })
type Input = z.input<typeof schema>
type Values = z.output<typeof schema>
const FIELDS = [
  'name',
  'starRating',
  'description',
  'address',
  'cityId',
  'latitude',
  'longitude',
  'ownerId',
] as const

/**
 * The reassign endpoint reports its validation error as "newOwnerId"; move it onto the form's owner field.
 * It runs after the update, so the other edits are already saved at this point.
 */
function ownerError(error: unknown): unknown {
  if (!isApiError(error)) return error
  const message = error.fieldErrors.newOwnerId ?? error.detail ?? error.userMessage
  return new ApiError({
    status: error.status,
    title: error.title,
    detail: `Hotel details were saved, but the owner wasn't changed: ${message}`,
    fieldErrors: error.status === 400 ? { ownerId: message } : {},
    formErrors: [`Hotel details were saved, but the owner wasn't changed.`],
    traceId: error.traceId,
  })
}

interface HotelDetailsFormProps {
  /** null = create. */
  hotel: HotelDto | null
  /** Mounts the map picker only while the sheet is open. */
  active: boolean
  onSaved: (hotel: HotelDto) => void
  onCancel: () => void
}

export function HotelDetailsForm({ hotel, active, onSaved, onCancel }: HotelDetailsFormProps) {
  const queryClient = useQueryClient()
  const isAdmin = useSession((s) => s.user?.role === 'Admin')
  const [formError, setFormError] = useState<string | null>(null)
  const isCreate = hotel === null

  const cities = useQuery({
    queryKey: queryKeys.cities.list({ pageSize: 100 }),
    queryFn: () => citiesApi.list({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  })
  const owners = useQuery({
    queryKey: queryKeys.users.hotelOwners,
    queryFn: () => usersApi.list({ role: 'HotelOwner', isActive: true, pageSize: 100 }),
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  })

  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(isAdmin ? adminSchema : schema),
    values: {
      name: hotel?.name ?? '',
      starRating: hotel?.starRating ?? 3,
      description: hotel?.description ?? '',
      address: hotel?.address ?? '',
      cityId: hotel?.cityId ?? '',
      latitude: hotel?.latitude ?? '',
      longitude: hotel?.longitude ?? '',
      ownerId: hotel?.ownerId ?? '',
    },
    // The hotel refetches after approve/reject; don't clobber edits in progress.
    resetOptions: { keepDirtyValues: true },
  })
  const errors = form.formState.errors
  const [latValue, lngValue] = useWatch({ control: form.control, name: ['latitude', 'longitude'] })
  const lat = Number(latValue)
  const lng = Number(lngValue)

  // The current owner may have been deactivated since; keep them selectable so the form still shows them.
  const ownerOptions = useMemo(() => {
    const list =
      owners.data?.items.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName} · ${u.email}` })) ?? []
    if (hotel && !list.some((o) => o.id === hotel.ownerId))
      list.unshift({ id: hotel.ownerId, label: hotel.ownerName })
    return list
  }, [owners.data, hotel])

  const save = useMutation({
    mutationFn: async ({ ownerId, ...body }: Values) => {
      if (!hotel) return hotelsApi.create({ ...body, ownerId: isAdmin ? ownerId : null })
      const saved = await hotelsApi.update(hotel.id, body)
      // Reassignment is its own admin endpoint; only call it when the owner actually changed.
      if (isAdmin && ownerId !== hotel.ownerId) {
        try {
          await hotelsApi.reassignOwner(hotel.id, ownerId)
        } catch (error) {
          throw ownerError(error)
        }
      }
      return saved
    },
    meta: { skipGlobalErrorToast: true },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cities.all }) // hotelsCount changed
      if (isCreate) {
        toast.success(
          saved.approvalStatus === 'Approved'
            ? `${saved.name} created and approved.`
            : `${saved.name} submitted for approval.`,
        )
      } else if (hotel.approvalStatus === 'Rejected' && saved.approvalStatus === 'Pending') {
        // An owner editing a rejected listing resubmits it automatically.
        toast.success(`${saved.name} updated and resubmitted for approval.`)
      } else {
        toast.success(`${saved.name} updated.`)
      }
      form.reset()
      onSaved(saved)
    },
    onError: (error) => {
      // A failed reassignment still leaves the update saved, so refresh the grid either way.
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
      setFormError(applyServerErrors(error, form.setError, FIELDS))
    },
  })

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
      <FormField id="hotel-name" label="Name" error={errors.name?.message}>
        <Input {...fieldA11y('hotel-name', errors.name?.message)} {...form.register('name')} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="hotel-city" label="City" error={errors.cityId?.message}>
          <Controller
            control={form.control}
            name="cityId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ''} onValueChange={field.onChange}>
                <SelectTrigger id="hotel-city" className="w-full" aria-invalid={!!errors.cityId || undefined}>
                  <SelectValue placeholder={cities.isPending ? 'Loading…' : 'Select a city'} />
                </SelectTrigger>
                <SelectContent>
                  {cities.data?.items.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}, {c.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="hotel-stars" label="Star rating" error={errors.starRating?.message}>
          <Controller
            control={form.control}
            name="starRating"
            render={({ field }) => (
              <Select value={String(field.value)} onValueChange={field.onChange}>
                <SelectTrigger id="hotel-stars" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {'★'.repeat(n)} ({n})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      {isAdmin && (
        <FormField
          id="hotel-owner"
          label="Owner"
          error={errors.ownerId?.message}
          hint={
            isCreate
              ? 'Only active users with the HotelOwner role are listed.'
              : 'Picking someone else reassigns the hotel to them.'
          }
        >
          <Controller
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="hotel-owner"
                  className="w-full"
                  aria-invalid={!!errors.ownerId || undefined}
                >
                  <SelectValue placeholder={owners.isPending ? 'Loading…' : 'Select an owner'} />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      )}

      <FormField id="hotel-address" label="Address" error={errors.address?.message}>
        <Input {...fieldA11y('hotel-address', errors.address?.message)} {...form.register('address')} />
      </FormField>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Location</legend>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="hotel-lat" label="Latitude" error={errors.latitude?.message}>
            <Input
              type="number"
              step="any"
              {...fieldA11y('hotel-lat', errors.latitude?.message)}
              {...form.register('latitude')}
            />
          </FormField>
          <FormField id="hotel-lng" label="Longitude" error={errors.longitude?.message}>
            <Input
              type="number"
              step="any"
              {...fieldA11y('hotel-lng', errors.longitude?.message)}
              {...form.register('longitude')}
            />
          </FormField>
        </div>
        <p className="text-xs text-muted-foreground">Click the map or drag the pin to set the location.</p>
        {active && (
          <Suspense fallback={<Skeleton className="h-56 w-full rounded-lg" />}>
            <LocationPicker
              latitude={lat}
              longitude={lng}
              onChange={(la, lo) => {
                form.setValue('latitude', la, { shouldValidate: true, shouldDirty: true })
                form.setValue('longitude', lo, { shouldValidate: true, shouldDirty: true })
              }}
            />
          </Suspense>
        )}
      </fieldset>

      <FormField id="hotel-description" label="Description" error={errors.description?.message}>
        <Textarea
          rows={5}
          {...fieldA11y('hotel-description', errors.description?.message)}
          {...form.register('description')}
        />
      </FormField>

      {!isAdmin && hotel?.approvalStatus === 'Rejected' && (
        <p className="text-xs text-muted-foreground">Saving resubmits this hotel for approval.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending
            ? 'Saving…'
            : isCreate
              ? isAdmin
                ? 'Create hotel'
                : 'Submit for approval'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
