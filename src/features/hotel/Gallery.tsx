import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { HotelImage } from '@/components/HotelImage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface GalleryProps {
  images: string[]
  name: string
}

/** Hero + thumbnails; click opens a fullscreen lightbox with ←/→/Esc and swipe (brief 4.1). */
export function Gallery({ images, name }: GalleryProps) {
  const [index, setIndex] = useState<number | null>(null)

  if (images.length === 0) {
    return (
      <HotelImage src={null} alt={`${name}: no photos yet`} className="aspect-[16/7] w-full rounded-xl" />
    )
  }

  const alt = (i: number) => `${name} photo ${i + 1}`
  const rest = images.slice(1, 5)

  return (
    <>
      <div className="grid gap-2 md:h-[420px] md:grid-cols-4 md:grid-rows-2">
        <button
          type="button"
          onClick={() => setIndex(0)}
          className="group relative overflow-hidden rounded-xl md:col-span-2 md:row-span-2"
          aria-label={`Open ${alt(0)} fullscreen`}
        >
          <HotelImage
            src={images[0]}
            alt={alt(0)}
            eager
            className="aspect-[16/10] size-full transition-transform group-hover:scale-105 md:aspect-auto"
          />
          <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
            <Expand className="size-3.5" aria-hidden /> {images.length} photo{images.length === 1 ? '' : 's'}
          </span>
        </button>
        {rest.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setIndex(i + 1)}
            className="group hidden overflow-hidden rounded-xl md:block"
            aria-label={`Open ${alt(i + 1)} fullscreen`}
          >
            <HotelImage
              src={src}
              alt={alt(i + 1)}
              className="size-full transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>
      <Lightbox images={images} name={name} index={index} onIndexChange={setIndex} />
    </>
  )
}

interface LightboxProps {
  images: string[]
  name: string
  index: number | null
  onIndexChange: (index: number | null) => void
}

export function Lightbox({ images, name, index, onIndexChange }: LightboxProps) {
  const touchStartX = useRef<number | null>(null)
  const open = index !== null
  const count = images.length

  const go = useCallback(
    (delta: number) => {
      if (index === null) return
      onIndexChange((index + delta + count) % count)
    },
    [index, count, onIndexChange],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        className="flex h-svh max-h-none w-screen max-w-none items-center justify-center rounded-none border-0 bg-black/95 p-0 text-white sm:max-w-none"
        onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchStartX.current
          const end = e.changedTouches[0]?.clientX
          if (start !== null && end !== undefined && Math.abs(end - start) > 50) go(end < start ? 1 : -1)
          touchStartX.current = null
        }}
      >
        <DialogTitle className="sr-only">{name} photos</DialogTitle>
        <DialogDescription className="sr-only">
          Use the left and right arrow keys to browse. Press Escape to close.
        </DialogDescription>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            className="absolute top-3 right-3 z-10 text-white hover:bg-white/10 hover:text-white"
            aria-label="Close photos"
          >
            <X className="size-6" />
          </Button>
        </DialogClose>
        {index !== null && (
          <img
            src={images[index]}
            alt={`${name} photo ${index + 1}`}
            className="max-h-[90svh] max-w-[95vw] object-contain"
          />
        )}
        {count > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon-lg"
              className="absolute top-1/2 left-2 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
              aria-label="Previous photo"
              onClick={() => go(-1)}
            >
              <ChevronLeft className="size-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
              aria-label="Next photo"
              onClick={() => go(1)}
            >
              <ChevronRight className="size-8" />
            </Button>
          </>
        )}
        {index !== null && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80"
            aria-live="polite"
          >
            {index + 1} / {count}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
