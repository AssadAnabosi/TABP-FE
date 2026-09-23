import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { bookingsApi } from '@/api/bookings'
import { queryKeys } from '@/api/queryKeys'
import { BOOKING_STATUSES, type BookingStatus, type HotelBookingListItemDto, type IsoDate } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookingStatusBadge } from '@/features/bookings/BookingStatusBadge'
import { useFrontDesk } from '@/features/bookings/useFrontDesk'
import { formatIsoDate, nightsBetween, todayIso } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

import { DataGrid } from '../components/DataGrid'
import { ManagePageHeader } from '../components/ManagePageHeader'
import { useManagedHotels } from '../hotels/managedHotels'
import { displayRoomNumber } from '../rooms/roomNumber'

const PAGE_SIZE = 20

const STATUS_LABEL: Record<BookingStatus, string> = {
  Pending: 'Awaiting payment',
  Confirmed: 'Confirmed',
  CheckedIn: 'Checked in',
  CheckedOut: 'Checked out',
  Cancelled: 'Cancelled',
}

interface Filters {
  status?: BookingStatus
  checkInFrom?: IsoDate
  checkInTo?: IsoDate
}

const PRESETS: Array<{ label: string; filters: () => Filters }> = [
  { label: 'All', filters: () => ({}) },
  {
    label: 'Arriving today',
    filters: () => ({ status: 'Confirmed', checkInFrom: todayIso(), checkInTo: todayIso() }),
  },
  { label: 'In house', filters: () => ({ status: 'CheckedIn' }) },
  { label: 'Awaiting payment', filters: () => ({ status: 'Pending' }) },
]

function sameFilters(a: Filters, b: Filters) {
  return a.status === b.status && a.checkInFrom === b.checkInFrom && a.checkInTo === b.checkInTo
}

/** Row action; stopPropagation so it doesn't also open the booking. */
function FrontDeskCell({ booking }: { booking: HotelBookingListItemDto }) {
  const next = useFrontDesk(booking)
  if (!next) return null
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={next.pending}
      onClick={(e) => {
        e.stopPropagation()
        next.run()
      }}
    >
      <next.icon /> {next.pending ? 'Saving…' : next.label}
    </Button>
  )
}

/** Front desk: a hotel's bookings with check-in/out (Admin: any hotel, HotelOwner: their own). */
export function BookingsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const keyword = useDebouncedValue(search.trim(), 300)
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)

  // Hotel in the URL, honoured only if this manager can act on it; an owner with one hotel gets it preselected.
  const hotels = useManagedHotels()
  const requestedId = Number(params.get('hotelId')) || null
  const selectedHotel =
    hotels.data?.find((h) => h.id === requestedId) ??
    (requestedId === null && hotels.data?.length === 1 ? hotels.data[0] : undefined)
  const hotelId = selectedHotel?.id ?? null
  const foreignLink = requestedId !== null && hotels.isSuccess && !selectedHotel

  const rangeInvalid = Boolean(
    filters.checkInFrom && filters.checkInTo && filters.checkInTo < filters.checkInFrom,
  )
  const query = { ...filters, keyword: keyword || undefined, pageNumber: page, pageSize: PAGE_SIZE }
  const bookings = useQuery({
    queryKey: queryKeys.bookings.byHotel(hotelId ?? 0, query),
    queryFn: ({ signal }) => bookingsApi.byHotel(hotelId!, query, signal),
    enabled: hotelId !== null && !rangeInvalid,
    placeholderData: keepPreviousData,
  })

  const update = (next: Filters) => {
    setFilters(next)
    setPage(1)
  }

  const columns = useMemo<ColumnDef<HotelBookingListItemDto, unknown>[]>(
    () => [
      {
        accessorKey: 'checkIn',
        header: 'Stay',
        cell: ({ row }) => {
          const b = row.original
          const nights = nightsBetween(b.checkIn, b.checkOut)
          return (
            <div className="whitespace-nowrap">
              <div className="font-medium">{formatIsoDate(b.checkIn)}</div>
              <div className="text-xs text-muted-foreground">
                → {formatIsoDate(b.checkOut)} · {nights} night{nights === 1 ? '' : 's'}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'guestName',
        header: 'Guest',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.guestName}</div>
            <div className="text-xs text-muted-foreground">{row.original.guestEmail}</div>
          </div>
        ),
      },
      {
        id: 'room',
        accessorFn: (b) => displayRoomNumber(b.roomNumber),
        header: 'Room',
        sortingFn: 'alphanumeric',
      },
      {
        id: 'guests',
        header: 'Guests',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {row.original.adults}A{row.original.children > 0 ? ` + ${row.original.children}C` : ''}
          </span>
        ),
      },
      {
        accessorKey: 'confirmationNumber',
        header: 'Confirmation',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.confirmationNumber}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <BookingStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'totalPrice',
        header: 'Total',
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatMoney(row.original.totalPrice, row.original.currency)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Front desk</span>,
        enableSorting: false,
        cell: ({ row }) => <FrontDeskCell booking={row.original} />,
      },
    ],
    [],
  )

  const activePreset = PRESETS.find((p) => sameFilters(p.filters(), filters))

  return (
    <>
      <ManagePageHeader
        title="Bookings"
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder="Confirmation #, guest email, first or last name…"
        filters={
          <Select
            value={hotelId ? String(hotelId) : ''}
            onValueChange={(value) => {
              setParams({ hotelId: value }, { replace: true })
              setPage(1)
            }}
          >
            <SelectTrigger className="w-64" aria-label="Hotel">
              <SelectValue placeholder={hotels.isPending ? 'Loading hotels…' : 'Choose a hotel'} />
            </SelectTrigger>
            <SelectContent>
              {hotels.data?.map((h) => (
                <SelectItem key={h.id} value={String(h.id)}>
                  {h.name} · {h.cityName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Quick filters">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant={activePreset === p ? 'default' : 'outline'}
              aria-pressed={activePreset === p}
              onClick={() => update(p.filters())}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="bk-status" className="text-xs">
            Status
          </Label>
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(v) =>
              update({ ...filters, status: v === 'all' ? undefined : (v as BookingStatus) })
            }
          >
            <SelectTrigger id="bk-status" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {BOOKING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="bk-from" className="text-xs">
            Check-in from
          </Label>
          <Input
            id="bk-from"
            type="date"
            className="w-40"
            value={filters.checkInFrom ?? ''}
            onChange={(e) => update({ ...filters, checkInFrom: e.target.value || undefined })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="bk-to" className="text-xs">
            Check-in to
          </Label>
          <Input
            id="bk-to"
            type="date"
            className={cn('w-40', rangeInvalid && 'border-destructive')}
            aria-invalid={rangeInvalid || undefined}
            aria-describedby={rangeInvalid ? 'bk-range-error' : undefined}
            value={filters.checkInTo ?? ''}
            onChange={(e) => update({ ...filters, checkInTo: e.target.value || undefined })}
          />
        </div>
      </div>
      {rangeInvalid && (
        <p id="bk-range-error" role="alert" className="-mt-2 mb-4 text-xs text-destructive">
          "Check-in to" can't be before "Check-in from".
        </p>
      )}

      {hotelId === null ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {foreignLink
            ? "That hotel isn't one you manage. Choose one of yours."
            : hotels.isSuccess && hotels.data.length === 0
              ? 'You have no hotels yet.'
              : 'Choose a hotel to see its bookings.'}
        </div>
      ) : (
        <DataGrid
          columns={columns}
          data={rangeInvalid ? [] : bookings.data?.items}
          isLoading={!rangeInvalid && bookings.isPending}
          error={bookings.error}
          onRetry={() => void bookings.refetch()}
          onRowClick={(b) => navigate(`/bookings/${b.id}/confirmation`)}
          rowLabel={(b) => `booking ${b.confirmationNumber}`}
          rowActionLabel="Open"
          emptyMessage={
            keyword || filters.status || filters.checkInFrom || filters.checkInTo
              ? 'No bookings match these filters.'
              : `${selectedHotel?.name ?? 'This hotel'} has no bookings yet.`
          }
          serverPagination={
            bookings.data && {
              pageNumber: bookings.data.pageNumber,
              totalPages: bookings.data.totalPages,
              totalCount: bookings.data.totalCount,
              onPageChange: setPage,
            }
          }
        />
      )}
    </>
  )
}
