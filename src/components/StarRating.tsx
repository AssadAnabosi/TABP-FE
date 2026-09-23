import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  max?: number
  className?: string
  size?: 'sm' | 'md'
}

/** Read-only star rating with a screen-reader label ("4 out of 5 stars"). */
export function StarRating({ value, max = 5, className, size = 'sm' }: StarRatingProps) {
  const rounded = Math.round(value)
  return (
    <span
      role="img"
      aria-label={`${value} out of ${max} stars`}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            size === 'sm' ? 'size-3.5' : 'size-5',
            i < rounded ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  )
}
