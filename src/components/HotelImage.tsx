import { ImageOff } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

interface HotelImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  eager?: boolean
}

/** Lazy-loaded image with a placeholder for missing/broken URLs. Sized by its container (aspect-* classes). */
export function HotelImage({ src, alt, className, eager }: HotelImageProps) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="size-8" aria-hidden />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('bg-muted object-cover', className)}
    />
  )
}
