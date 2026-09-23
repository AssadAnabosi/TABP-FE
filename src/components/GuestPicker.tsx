import { Minus, Plus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface Guests {
  adults: number
  children: number
  rooms: number
}

interface StepperProps {
  label: string
  hint?: string
  value: number
  min: number
  max?: number
  onChange: (value: number) => void
}

export function Stepper({ label, hint, value, min, max = 20, onChange }: StepperProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="flex items-center gap-2" role="group" aria-label={label}>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus />
        </Button>
        <output className="w-6 text-center text-sm tabular-nums" aria-live="polite">
          {value}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}

interface GuestPickerProps {
  value: Guests
  onChange: (value: Guests) => void
  showRooms?: boolean
  className?: string
}

/** Adults (min 1), children (min 0), rooms (min 1). */
export function GuestPicker({ value, onChange, showRooms = true, className }: GuestPickerProps) {
  const summary = [
    `${value.adults} adult${value.adults === 1 ? '' : 's'}`,
    `${value.children} child${value.children === 1 ? '' : 'ren'}`,
    showRooms ? `${value.rooms} room${value.rooms === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('h-10 justify-start gap-2 font-normal', className)}>
          <Users className="text-muted-foreground" aria-hidden />
          <span className="truncate">{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <Stepper
          label="Adults"
          hint="Ages 18+"
          value={value.adults}
          min={1}
          onChange={(adults) => onChange({ ...value, adults })}
        />
        <Stepper
          label="Children"
          hint="Ages 0–17"
          value={value.children}
          min={0}
          onChange={(children) => onChange({ ...value, children })}
        />
        {showRooms && (
          <>
            <Stepper
              label="Rooms"
              value={value.rooms}
              min={1}
              onChange={(rooms) => onChange({ ...value, rooms })}
            />
            {value.rooms > 1 && (
              // The API checks capacity per single room (kickoff §9 G11).
              <p className="pt-1 text-xs text-muted-foreground">
                Hotels are matched on a single room fitting all guests. Add more rooms from the hotel page.
              </p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
