import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { amenitiesApi } from '@/api/amenities'
import { queryKeys } from '@/api/queryKeys'
import { ROOM_TYPES, type RoomType } from '@/api/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { SearchState } from './searchParams'

export type FilterPatch = Partial<
  Pick<SearchState, 'minPrice' | 'maxPrice' | 'minStarRating' | 'amenityIds' | 'roomType'>
>

interface FiltersPanelProps {
  state: SearchState
  onChange: (patch: FilterPatch) => void
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  )
}

/** Price inputs are debounced (~400 ms) so typing doesn't fire a search per keystroke. */
function PriceFilter({
  min,
  max,
  onChange,
}: {
  min?: number
  max?: number
  onChange: (patch: FilterPatch) => void
}) {
  const [draft, setDraft] = useState({ min: min?.toString() ?? '', max: max?.toString() ?? '' })

  // Re-sync when the URL changes from outside (e.g. "Clear all" or a removed chip), adjusting state
  // during render rather than in an effect. Skip when the draft already means the same number, so an
  // in-progress "10." isn't clobbered by the debounced URL update to 10.
  const [synced, setSynced] = useState({ min, max })
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max })
    const sameAs = (text: string, value?: number) =>
      text === '' ? value === undefined : Number(text) === value
    if (!sameAs(draft.min, min) || !sameAs(draft.max, max))
      setDraft({ min: min?.toString() ?? '', max: max?.toString() ?? '' })
  }

  useEffect(() => {
    const next = {
      minPrice: draft.min === '' ? undefined : Number(draft.min),
      maxPrice: draft.max === '' ? undefined : Number(draft.max),
    }
    if (next.minPrice === min && next.maxPrice === max) return
    const timer = setTimeout(() => onChange(next), 400)
    return () => clearTimeout(timer)
  }, [draft, min, max, onChange])

  const invalid = draft.min !== '' && draft.max !== '' && Number(draft.max) < Number(draft.min)

  return (
    <FilterGroup title="Price per night">
      <div className="flex items-center gap-2">
        <Label className="sr-only" htmlFor="minPrice">
          Minimum price
        </Label>
        <Input
          id="minPrice"
          inputMode="decimal"
          type="number"
          min={0}
          placeholder="Min"
          value={draft.min}
          onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
        />
        <span className="text-muted-foreground">–</span>
        <Label className="sr-only" htmlFor="maxPrice">
          Maximum price
        </Label>
        <Input
          id="maxPrice"
          inputMode="decimal"
          type="number"
          min={0}
          placeholder="Max"
          aria-invalid={invalid || undefined}
          value={draft.max}
          onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
        />
      </div>
      {invalid && <p className="text-xs text-destructive">Max must be at least the min price.</p>}
    </FilterGroup>
  )
}

export function FiltersPanel({ state, onChange }: FiltersPanelProps) {
  const amenities = useQuery({
    queryKey: queryKeys.amenities,
    queryFn: amenitiesApi.list,
    staleTime: 10 * 60_000,
  })

  function toggleAmenity(id: number, checked: boolean) {
    const next = checked ? [...state.amenityIds, id] : state.amenityIds.filter((a) => a !== id)
    onChange({ amenityIds: next })
  }

  return (
    <div className="space-y-6">
      <PriceFilter min={state.minPrice} max={state.maxPrice} onChange={onChange} />
      <Separator />

      <FilterGroup title="Star rating">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Minimum star rating">
          {[undefined, 2, 3, 4, 5].map((stars) => {
            const active = state.minStarRating === stars
            return (
              <button
                key={stars ?? 'any'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ minStarRating: stars })}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {stars ? (
                  <>
                    {stars}
                    <Star className="size-3.5 fill-current" aria-hidden />
                    {stars < 5 && <span>& up</span>}
                  </>
                ) : (
                  'Any'
                )}
              </button>
            )
          })}
        </div>
      </FilterGroup>
      <Separator />

      <FilterGroup title="Room type">
        <RadioGroup
          value={state.roomType ?? 'any'}
          onValueChange={(value) => onChange({ roomType: value === 'any' ? undefined : (value as RoomType) })}
        >
          {(['any', ...ROOM_TYPES] as const).map((type) => (
            <div key={type} className="flex items-center gap-2">
              <RadioGroupItem value={type} id={`roomType-${type}`} />
              <Label htmlFor={`roomType-${type}`} className="font-normal">
                {type === 'any' ? 'Any' : type}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FilterGroup>
      <Separator />

      <FilterGroup title="Amenities">
        {amenities.isPending &&
          Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-5 w-32" />)}
        {amenities.isError && <p className="text-sm text-muted-foreground">Couldn't load amenities.</p>}
        {amenities.data?.map((amenity) => (
          <div key={amenity.id} className="flex items-center gap-2">
            <Checkbox
              id={`amenity-${amenity.id}`}
              checked={state.amenityIds.includes(amenity.id)}
              onCheckedChange={(checked) => toggleAmenity(amenity.id, checked === true)}
            />
            <Label htmlFor={`amenity-${amenity.id}`} className="font-normal">
              {amenity.name}
            </Label>
          </div>
        ))}
        {amenities.data && amenities.data.length > 0 && (
          <p className="text-xs text-muted-foreground">Hotels must have all selected amenities.</p>
        )}
      </FilterGroup>
    </div>
  )
}
