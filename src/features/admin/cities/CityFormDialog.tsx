import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { citiesApi } from '@/api/cities'
import { queryKeys } from '@/api/queryKeys'
import type { CityDto } from '@/api/types'
import { FormField } from '@/components/FormField'
import { HotelImage } from '@/components/HotelImage'
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
import { applyServerErrors, fieldA11y } from '@/lib/forms'

// Mirrors the backend City validator (kickoff §12).
const schema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(150),
  country: z.string().trim().min(1, 'Country is required.').max(100),
  postOffice: z.string().trim().min(1, 'Post office is required.').max(20),
  // Optional: empty means "no thumbnail" (sent as null); otherwise an absolute http(s) URL.
  thumbnailUrl: z
    .string()
    .trim()
    .max(2000, 'Keep the URL under 2000 characters.')
    .refine((v) => v === '' || isHttpUrl(v), 'Enter a full http(s) URL.')
    .transform((v) => v || null),
})
type Input = z.input<typeof schema>
type Values = z.output<typeof schema>
const FIELDS = ['name', 'country', 'postOffice', 'thumbnailUrl'] as const

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

interface CityFormDialogProps {
  /** null = create. */
  city: CityDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CityFormDialog({ city, open, onOpenChange }: CityFormDialogProps) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    values: {
      name: city?.name ?? '',
      country: city?.country ?? '',
      postOffice: city?.postOffice ?? '',
      thumbnailUrl: city?.thumbnailUrl ?? '',
    },
  })
  const errors = form.formState.errors
  const thumbnail = useWatch({ control: form.control, name: 'thumbnailUrl' }).trim()

  const save = useMutation({
    mutationFn: (values: Values) => (city ? citiesApi.update(city.id, values) : citiesApi.create(values)),
    meta: { skipGlobalErrorToast: true },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cities.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.visits.trending }) // shows the thumbnail
      toast.success(city ? `${saved.name} updated.` : `${saved.name} created.`)
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
          <DialogTitle>{city ? `Edit ${city.name}` : 'New city'}</DialogTitle>
          <DialogDescription>
            {city ? 'Update the city details.' : 'Add a city that hotels can be listed in.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id="city-form"
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
          <FormField id="city-name" label="Name" error={errors.name?.message}>
            <Input {...fieldA11y('city-name', errors.name?.message)} {...form.register('name')} />
          </FormField>
          <FormField id="city-country" label="Country" error={errors.country?.message}>
            <Input {...fieldA11y('city-country', errors.country?.message)} {...form.register('country')} />
          </FormField>
          <FormField id="city-postOffice" label="Post office" error={errors.postOffice?.message}>
            <Input
              {...fieldA11y('city-postOffice', errors.postOffice?.message)}
              {...form.register('postOffice')}
            />
          </FormField>
          <FormField
            id="city-thumbnailUrl"
            label="Thumbnail URL (optional)"
            error={errors.thumbnailUrl?.message}
            hint="Shown on the home page under Trending destinations."
          >
            <Input
              type="url"
              inputMode="url"
              placeholder="https://…"
              {...fieldA11y('city-thumbnailUrl', errors.thumbnailUrl?.message)}
              {...form.register('thumbnailUrl')}
            />
          </FormField>
          {thumbnail && isHttpUrl(thumbnail) && (
            <HotelImage
              key={thumbnail}
              src={thumbnail}
              alt="Thumbnail preview"
              className="aspect-[16/9] w-full rounded-lg"
            />
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="city-form" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : city ? 'Save changes' : 'Create city'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
