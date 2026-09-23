import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { queryKeys } from '@/api/queryKeys'
import { roomsApi } from '@/api/rooms'
import type { RoomDto } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMoney } from '@/lib/money'

import { ManagePageHeader } from '../components/ManagePageHeader'
import { deleteColumn, timestampColumns } from '../components/columns'
import { DataGrid } from '../components/DataGrid'
import { useManagedHotels } from '../hotels/managedHotels'
import { RoomFormDialog } from './RoomFormDialog'
import { RoomSheet } from './RoomSheet'
import { displayRoomNumber, isSoftDeleted } from './roomNumber'

export function RoomsPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const requestedId = Number(params.get('hotelId')) || null
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [creating, setCreating] = useState(false)
  const [managing, setManaging] = useState<RoomDto | null>(null)
  const [deleting, setDeleting] = useState<RoomDto | null>(null)

  // Rooms are listed per hotel only, so a hotel must be chosen first (kept in the URL).
  // Admins pick from every hotel, owners from their own.
  const hotels = useManagedHotels()
  // Only honour ?hotelId= for a hotel this manager can act on (an owner's own hotels), so a stale or
  // foreign link shows the picker instead of a 403.
  const selectedHotel = hotels.data?.find((h) => h.id === requestedId)
  const hotelId = selectedHotel ? selectedHotel.id : null
  const foreignLink = requestedId !== null && hotels.isSuccess && !selectedHotel
  const rooms = useQuery({
    queryKey: queryKeys.rooms.byHotel(hotelId ?? 0),
    queryFn: () => roomsApi.byHotel(hotelId!),
    enabled: hotelId !== null,
  })

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rooms.data?.filter(
      (r) =>
        (showDeleted || !isSoftDeleted(r.number)) &&
        (!term ||
          displayRoomNumber(r.number).toLowerCase().includes(term) ||
          r.roomType.toLowerCase().includes(term)),
    )
  }, [rooms.data, search, showDeleted])

  const remove = useMutation({
    mutationFn: (room: RoomDto) => roomsApi.delete(room.id),
    onSuccess: (_, room) => {
      toast.success(`Room ${displayRoomNumber(room.number)} deleted.`)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hotels.all })
    },
    onError: () => setDeleting(null),
  })

  const columns = useMemo<ColumnDef<RoomDto, unknown>[]>(
    () => [
      {
        id: 'number',
        accessorFn: (r) => displayRoomNumber(r.number),
        header: 'Number',
        sortingFn: 'alphanumeric',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      { accessorKey: 'roomType', header: 'Type' },
      {
        // RoomDto only carries isActive; date-based availability isn't exposed (kickoff §9 G8).
        id: 'availability',
        accessorKey: 'isActive',
        header: 'Availability',
        cell: ({ row }) =>
          isSoftDeleted(row.original.number) ? (
            <Badge variant="destructive">Deleted</Badge>
          ) : row.original.isActive ? (
            <Badge>Available</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          ),
      },
      { accessorKey: 'adultCapacity', header: 'Adults' },
      { accessorKey: 'childCapacity', header: 'Children' },
      {
        accessorKey: 'basePrice',
        header: 'Base price',
        cell: ({ row }) => formatMoney(row.original.basePrice, row.original.currency),
      },
      ...timestampColumns<RoomDto>(),
      deleteColumn<RoomDto>(
        (r) => `room ${displayRoomNumber(r.number)}`,
        setDeleting,
        (r) => (isSoftDeleted(r.number) ? 'Already deleted.' : null),
      ),
    ],
    [],
  )

  return (
    <>
      <ManagePageHeader
        title="Rooms"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by number or type…"
        createLabel="New room"
        createDisabled={hotelId === null}
        onCreate={() => setCreating(true)}
        filters={
          <>
            <Select
              value={hotelId ? String(hotelId) : ''}
              onValueChange={(value) => setParams({ hotelId: value }, { replace: true })}
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-deleted"
                checked={showDeleted}
                onCheckedChange={(v) => setShowDeleted(v === true)}
              />
              <Label htmlFor="show-deleted" className="font-normal">
                Show deleted
              </Label>
            </div>
          </>
        }
      />

      {hotelId === null ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {foreignLink
            ? "That hotel isn't one you manage. Choose one of yours."
            : hotels.isPending && requestedId !== null
              ? 'Loading…'
              : 'Choose a hotel to manage its rooms.'}
        </div>
      ) : (
        <DataGrid
          columns={columns}
          data={visible}
          isLoading={rooms.isPending}
          error={rooms.error}
          onRetry={() => void rooms.refetch()}
          onRowClick={(room) => {
            if (!isSoftDeleted(room.number)) setManaging(room)
          }}
          rowLabel={(r) => `room ${displayRoomNumber(r.number)}`}
          emptyMessage={
            search
              ? 'No rooms match your filter.'
              : `${selectedHotel?.name ?? 'This hotel'} has no rooms yet.`
          }
        />
      )}

      {hotelId !== null && <RoomFormDialog hotelId={hotelId} open={creating} onOpenChange={setCreating} />}
      <RoomSheet
        room={managing}
        open={managing !== null}
        onOpenChange={(open) => !open && setManaging(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete room ${deleting ? displayRoomNumber(deleting.number) : ''}?`}
        description="Rooms that were never booked are removed completely. Rooms with booking history are deactivated instead, keeping the history and freeing the number."
        confirmLabel="Delete room"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
