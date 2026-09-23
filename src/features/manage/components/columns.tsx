import type { ColumnDef } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDateTime } from '@/lib/dates'

interface Timestamped {
  createdAt: string
  modifiedAt: string | null
}

/** Created + Modified columns, local date-time; "—" when never modified. */
export function timestampColumns<T extends Timestamped>(): ColumnDef<T, unknown>[] {
  return [
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
    },
    {
      id: 'modifiedAt',
      accessorKey: 'modifiedAt',
      header: 'Modified',
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.modifiedAt)}</span>,
    },
  ]
}

/** Row delete action. stopPropagation so it doesn't also open the update form. */
export function deleteColumn<T>(
  label: (row: T) => string,
  onDelete: (row: T) => void,
  disabledReason?: (row: T) => string | null,
): ColumnDef<T, unknown> {
  return {
    id: 'delete',
    header: () => <span className="sr-only">Delete</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const reason = disabledReason?.(row.original) ?? null
      const button = (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete ${label(row.original)}`}
          disabled={!!reason}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(row.original)
          }}
        >
          <Trash2 />
        </Button>
      )
      if (!reason) return button
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} onClick={(e) => e.stopPropagation()} className="inline-block">
              {button}
            </span>
          </TooltipTrigger>
          <TooltipContent>{reason}</TooltipContent>
        </Tooltip>
      )
    },
  }
}
