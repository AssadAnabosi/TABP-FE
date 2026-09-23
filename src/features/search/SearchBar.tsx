import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { DateRangePicker } from '@/components/DateRangePicker'
import { GuestPicker } from '@/components/GuestPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { toSearchParams, type SearchState, type StayParams } from './searchParams'

interface SearchBarProps {
  initial: StayParams & { keyword?: string }
  /** Filters to carry over when searching again from the results page. */
  preserve?: Partial<SearchState>
  compact?: boolean
  className?: string
}

/** The home search bar (brief 2.1); reused compact on the results page. Submits to /search?… */
export function SearchBar({ initial, preserve, compact, className }: SearchBarProps) {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState(initial.keyword ?? '')
  const [stay, setStay] = useState({ checkIn: initial.checkIn, checkOut: initial.checkOut })
  const [guests, setGuests] = useState({
    adults: initial.adults,
    children: initial.children,
    rooms: initial.rooms,
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    const keywordChanged = keyword.trim() !== (initial.keyword ?? '')
    const params = toSearchParams({
      ...preserve,
      // A new free-text search replaces a city picked from "Trending destinations".
      cityId: keywordChanged ? undefined : preserve?.cityId,
      keyword: keyword.trim() || undefined,
      ...stay,
      ...guests,
    })
    navigate(`/search?${params}`)
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn(
        'grid gap-2 rounded-xl border bg-card p-2 shadow-sm',
        compact ? 'md:grid-cols-[1fr_auto_auto_auto]' : 'md:grid-cols-[1.4fr_1fr_1fr_auto] md:p-3',
        className,
      )}
    >
      <label className="relative">
        <span className="sr-only">Destination or hotel</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search for hotels, cities..."
          className="h-10 pl-9"
          maxLength={200}
        />
      </label>
      <DateRangePicker checkIn={stay.checkIn} checkOut={stay.checkOut} onChange={setStay} />
      <GuestPicker value={guests} onChange={setGuests} />
      <Button type="submit" size="lg" className="h-10 px-5">
        Search
      </Button>
    </form>
  )
}
