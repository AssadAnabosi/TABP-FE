import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'

import type { IsoDate } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatIsoDate, nightsBetween, parseIsoDate, toIsoDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  checkIn: IsoDate
  checkOut: IsoDate
  onChange: (range: { checkIn: IsoDate; checkOut: IsoDate }) => void
  className?: string
  id?: string
}

/** Check-in/check-out range. Past dates are disabled; check-out must be after check-in. */
export function DateRangePicker({ checkIn, checkOut, onChange, className, id }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const selected: DateRange = draft ?? {
    from: parseIsoDate(checkIn) ?? undefined,
    to: parseIsoDate(checkOut) ?? undefined,
  }
  const nights = nightsBetween(checkIn, checkOut)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setDraft(undefined)
      }}
    >
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className={cn('h-10 justify-start gap-2 font-normal', className)}>
          <CalendarDays className="text-muted-foreground" aria-hidden />
          <span className="truncate">
            {formatIsoDate(checkIn)} – {formatIsoDate(checkOut)}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {nights} night{nights === 1 ? '' : 's'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={selected.from}
          selected={selected}
          disabled={{ before: today }}
          resetOnSelect
          onSelect={(range) => {
            // Commit only a complete range of at least one night; otherwise keep picking.
            if (range?.from && range.to && range.to > range.from) {
              onChange({ checkIn: toIsoDate(range.from), checkOut: toIsoDate(range.to) })
              setDraft(undefined)
              setOpen(false)
            } else {
              setDraft(range?.from ? { from: range.from, to: undefined } : undefined)
            }
          }}
        />
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          {draft?.from ? 'Now pick your check-out date.' : 'Pick check-in, then check-out.'}
        </p>
      </PopoverContent>
    </Popover>
  )
}
