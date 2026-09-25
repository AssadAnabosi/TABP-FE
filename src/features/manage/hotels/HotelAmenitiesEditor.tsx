import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { amenitiesApi } from '@/api/amenities'
import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { HotelDto } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

function sameSet(a: number[], b: number[]) {
  return a.length === b.length && a.every((id) => b.includes(id))
}

/**
 * Replaces the hotel's whole amenity set (PUT /api/hotels/{id}/amenities), starting from
 * HotelDto.amenityIds (available in any approval state).
 */
export function HotelAmenitiesEditor({ hotel }: { hotel: HotelDto }) {
  const queryClient = useQueryClient()
  const amenities = useQuery({
    queryKey: queryKeys.amenities,
    queryFn: amenitiesApi.list,
    staleTime: 5 * 60_000,
  })

  const current = hotel.amenityIds ?? []
  const [selected, setSelected] = useState<number[] | null>(null)
  const effective = selected ?? current
  const dirty = selected !== null && !sameSet(selected, current)

  const save = useMutation({
    mutationFn: (ids: number[]) => hotelsApi.setAmenities(hotel.id, ids),
    onSuccess: async () => {
      toast.success(`Amenities for ${hotel.name} saved.`)
      // Wait for the hotel to refetch so the ticks don't flash back to the old set.
      await queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
      setSelected(null)
    },
  })

  if (amenities.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-40" />
        ))}
      </div>
    )
  }
  if (amenities.isError) return <p className="text-sm text-muted-foreground">Couldn't load amenities.</p>

  // Functional update: several quick toggles before a re-render must all apply.
  const toggle = (id: number, on: boolean) =>
    setSelected((prev) => {
      const base = prev ?? current
      return on ? [...base.filter((a) => a !== id), id] : base.filter((a) => a !== id)
    })

  return (
    <div className="space-y-4">
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
        {dirty && (
          <Button variant="outline" onClick={() => setSelected(null)}>
            Reset
          </Button>
        )}
        <Button onClick={() => save.mutate(effective)} disabled={save.isPending || !dirty}>
          {save.isPending ? 'Saving…' : 'Save amenities'}
        </Button>
      </div>
    </div>
  )
}
