import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { amenitiesApi } from '@/api/amenities'
import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { HotelDto } from '@/api/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

import { usePublicHotel } from './usePublicHotel'

/** Replaces the hotel's whole amenity set (PUT /api/hotels/{id}/amenities). */
export function HotelAmenitiesEditor({ hotel }: { hotel: HotelDto }) {
  const queryClient = useQueryClient()
  const amenities = useQuery({
    queryKey: queryKeys.amenities,
    queryFn: amenitiesApi.list,
    staleTime: 5 * 60_000,
  })
  const detail = usePublicHotel(hotel)
  const approved = hotel.approvalStatus === 'Approved'

  // The public detail lists amenity names, not ids; map them back once both have loaded.
  const current =
    approved && detail.data && amenities.data
      ? amenities.data.filter((a) => detail.data.amenities.includes(a.name)).map((a) => a.id)
      : null
  const [selected, setSelected] = useState<number[] | null>(null)
  const effective = selected ?? current ?? []

  const save = useMutation({
    mutationFn: (ids: number[]) => hotelsApi.setAmenities(hotel.id, ids),
    onSuccess: () => {
      toast.success(`Amenities for ${hotel.name} saved.`)
      setSelected(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
    },
  })

  const loading = amenities.isPending || (approved && detail.isPending)
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-40" />
        ))}
      </div>
    )
  }
  if (amenities.isError) return <p className="text-sm text-muted-foreground">Couldn't load amenities.</p>

  const toggle = (id: number, on: boolean) =>
    setSelected(on ? [...effective, id] : effective.filter((a) => a !== id))

  return (
    <div className="space-y-4">
      {!approved && (
        <Alert>
          <AlertDescription>
            The API only exposes a hotel's current amenities once it's approved, so they can't be shown here.
            Saving replaces the hotel's whole amenity set with what's ticked below.
          </AlertDescription>
        </Alert>
      )}
      {amenities.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No amenities exist yet.{' '}
          <Link to="/manage/amenities" className="underline underline-offset-4">
            Create some first
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {amenities.data.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <Checkbox
                id={`hotel-amenity-${a.id}`}
                checked={effective.includes(a.id)}
                onCheckedChange={(v) => toggle(a.id, v === true)}
              />
              <Label htmlFor={`hotel-amenity-${a.id}`} className="font-normal">
                {a.name}
              </Label>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        {selected && (
          <Button variant="outline" onClick={() => setSelected(null)}>
            Reset
          </Button>
        )}
        <Button onClick={() => save.mutate(effective)} disabled={save.isPending || (!selected && approved)}>
          {save.isPending ? 'Saving…' : 'Save amenities'}
        </Button>
      </div>
    </div>
  )
}
