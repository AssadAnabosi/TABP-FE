import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { amenitiesApi } from '@/api/amenities'
import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { AmenityDto } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
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
import { fieldA11y } from '@/lib/forms'

import { ManagePageHeader } from '../components/ManagePageHeader'
import { deleteColumn, timestampColumns } from '../components/columns'
import { DataGrid } from '../components/DataGrid'

const MAX_NAME = 100

function AmenityFormDialog({
  amenity,
  open,
  onOpenChange,
}: {
  amenity: AmenityDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Prefill when the dialog opens for a different amenity (adjusting state during render).
  const [openedFor, setOpenedFor] = useState<AmenityDto | null | undefined>(undefined)
  if (open && openedFor !== amenity) {
    setOpenedFor(amenity)
    setName(amenity?.name ?? '')
    setError(null)
  }
  if (!open && openedFor !== undefined) setOpenedFor(undefined)

  const save = useMutation({
    mutationFn: (value: string) =>
      amenity ? amenitiesApi.update(amenity.id, value) : amenitiesApi.create(value),
    meta: { skipGlobalErrorToast: true },
    onSuccess: (saved) => {
      toast.success(amenity ? `Renamed to "${saved.name}".` : `"${saved.name}" created.`)
      void queryClient.invalidateQueries({ queryKey: queryKeys.amenities })
      onOpenChange(false)
    },
    onError: (e) =>
      setError(isApiError(e) ? (e.fieldErrors.name ?? e.userMessage) : 'Could not save the amenity.'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{amenity ? `Rename "${amenity.name}"` : 'New amenity'}</DialogTitle>
          <DialogDescription>
            Amenities are shared by all hotels and used as search filters.
          </DialogDescription>
        </DialogHeader>
        <form
          id="amenity-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            const value = name.trim()
            if (!value) return setError('Name is required.')
            if (value.length > MAX_NAME) return setError(`Keep it under ${MAX_NAME} characters.`)
            setError(null)
            save.mutate(value)
          }}
        >
          <FormField id="amenity-name" label="Name" error={error ?? undefined}>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Airport shuttle"
              {...fieldA11y('amenity-name', error ?? undefined)}
            />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="amenity-form" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : amenity ? 'Rename' : 'Create amenity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Shared amenity catalogue (Admin and HotelOwner can manage it). */
export function AmenitiesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AmenityDto | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<AmenityDto | null>(null)

  const amenities = useQuery({ queryKey: queryKeys.amenities, queryFn: amenitiesApi.list })
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = amenities.data ? [...amenities.data].sort((a, b) => a.name.localeCompare(b.name)) : undefined
    return term ? list?.filter((a) => a.name.toLowerCase().includes(term)) : list
  }, [amenities.data, search])

  const remove = useMutation({
    mutationFn: (a: AmenityDto) => amenitiesApi.delete(a.id),
    onSuccess: (_, a) => {
      toast.success(`"${a.name}" deleted.`)
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.amenities })
    },
    // 409 while assigned to a hotel: the global toast shows the server's reason.
    onError: () => setDeleting(null),
  })

  const columns = useMemo<ColumnDef<AmenityDto, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      ...timestampColumns<AmenityDto>(),
      deleteColumn<AmenityDto>((a) => a.name, setDeleting),
    ],
    [],
  )

  return (
    <>
      <ManagePageHeader
        title="Amenities"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter amenities…"
        createLabel="New amenity"
        onCreate={() => {
          setEditing(null)
          setFormOpen(true)
        }}
      />
      <DataGrid
        columns={columns}
        data={filtered}
        isLoading={amenities.isPending}
        error={amenities.error}
        onRetry={() => void amenities.refetch()}
        onRowClick={(a) => {
          setEditing(a)
          setFormOpen(true)
        }}
        rowLabel={(a) => a.name}
        emptyMessage={search ? 'No amenities match your filter.' : 'No amenities yet.'}
      />
      <AmenityFormDialog amenity={editing} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Amenities still assigned to a hotel can't be deleted; remove them from those hotels first."
        confirmLabel="Delete amenity"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}
