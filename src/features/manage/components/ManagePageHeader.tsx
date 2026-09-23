import { Plus, Search } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ManagePageHeaderProps {
  title: string
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  /** Omit both to hide the Create button (e.g. users self-register). */
  createLabel?: string
  onCreate?: () => void
  createDisabled?: boolean
  /** Extra filter controls rendered next to the search box. */
  filters?: ReactNode
}

/** Page title + grid search/filter bar (brief 6.2) + Create button (brief 6.4). */
export function ManagePageHeader({
  title,
  search,
  onSearchChange,
  searchPlaceholder,
  createLabel,
  onCreate,
  createDisabled,
  filters,
}: ManagePageHeaderProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {onCreate && createLabel && (
          <Button onClick={onCreate} disabled={createDisabled}>
            <Plus /> {createLabel}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-60 flex-1 sm:max-w-sm">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </label>
        {filters}
      </div>
    </div>
  )
}
