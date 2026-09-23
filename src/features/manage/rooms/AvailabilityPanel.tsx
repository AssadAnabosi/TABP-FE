import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarX2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { roomsApi } from '@/api/rooms'
import type { IsoDate, RoomDto } from '@/api/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDaysIso, formatIsoDate, todayIso } from '@/lib/dates'

interface Block {
  availabilityId: number
  startDate: IsoDate
  endDate: IsoDate
}

/**
 * Takes a room off sale for a date range (maintenance, private use, …). The API can create and remove
 * blocks but never lists them (kickoff §9 G8), so only blocks made in this session can be undone here.
 */
export function AvailabilityPanel({ room }: { room: RoomDto }) {
  const queryClient = useQueryClient()
  const today = todayIso()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(addDaysIso(today, 1))
  const [error, setError] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])

  // Availability changes what search and the hotel page return.
  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })

  const block = useMutation({
    mutationFn: () => roomsApi.blockDates(room.id, { startDate, endDate }),
    meta: { skipGlobalErrorToast: true },
    onSuccess: ({ availabilityId }) => {
      setBlocks((b) => [...b, { availabilityId, startDate, endDate }])
      toast.success(`Blocked ${formatIsoDate(startDate)} – ${formatIsoDate(endDate)}.`)
      refresh()
    },
    onError: (e) =>
      setError(
        isApiError(e) && e.status === 409
          ? (e.detail ?? 'Those dates overlap a booking or an existing block.')
          : isApiError(e)
            ? e.userMessage
            : 'Could not block these dates.',
      ),
  })

  const unblock = useMutation({
    mutationFn: (b: Block) => roomsApi.unblockDates(room.id, b.availabilityId),
    onSuccess: (_, b) => {
      setBlocks((list) => list.filter((x) => x.availabilityId !== b.availabilityId))
      toast.success('Dates unblocked.')
      refresh()
    },
  })

  return (
    <div className="space-y-4">
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!startDate || !endDate) return setError('Pick both dates.')
          if (endDate <= startDate) return setError('End date must be after the start date.')
          setError(null)
          block.mutate()
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="block-start">From</Label>
            <Input
              id="block-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="block-end">Available again on</Label>
            <Input id="block-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={block.isPending}>
            <CalendarX2 /> {block.isPending ? 'Blocking…' : 'Block dates'}
          </Button>
        </div>
      </form>

      {blocks.length > 0 && (
        <ul className="space-y-2">
          {blocks.map((b) => (
            <li
              key={b.availabilityId}
              className="flex items-center justify-between rounded-lg border p-2 text-sm"
            >
              <span>
                Blocked {formatIsoDate(b.startDate)} – {formatIsoDate(b.endDate)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={unblock.isPending}
                onClick={() => unblock.mutate(b)}
              >
                <Undo2 /> Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Alert>
        <AlertDescription>
          The API doesn't list a room's existing blocks, so blocks made earlier can't be shown or removed
          here. To see which dates are booked, use the Bookings page.
        </AlertDescription>
      </Alert>
    </div>
  )
}
