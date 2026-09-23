import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import { visitsApi } from '@/api/visits'
import { useSession } from '@/auth/session'
import { HotelImage } from '@/components/HotelImage'
import { StarRating } from '@/components/StarRating'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { defaultStay } from '@/lib/dates'
import { discountPercent, formatMoney } from '@/lib/money'

import { SearchBar } from '../search/SearchBar'
import { DEFAULT_GUESTS, stayQuery, toSearchParams } from '../search/searchParams'
import { cityImage } from './cityImages'

const STATIC_STALE = 5 * 60_000

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
}

function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <CardGrid>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </CardGrid>
  )
}

function hotelLink(hotelId: number) {
  return `/hotels/${hotelId}?${stayQuery({ ...defaultStay(), ...DEFAULT_GUESTS })}`
}

function FeaturedDeals() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.hotels.featured,
    queryFn: () => hotelsApi.featuredDeals(5),
    staleTime: STATIC_STALE,
  })
  // The API may return 0–5 deals (only rooms discounted today); hide the section when there are none.
  if (isError || (data && data.length === 0)) return null

  return (
    <Section title="Featured Deals" subtitle="Limited-time discounts at top-rated hotels.">
      {isPending ? (
        <CardSkeletons />
      ) : (
        <CardGrid>
          {data.map((deal) => {
            const off = discountPercent(deal.originalPrice, deal.discountedPrice)
            return (
              <Link
                key={deal.hotelId}
                to={hotelLink(deal.hotelId)}
                className="group rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="relative overflow-hidden rounded-lg">
                  <HotelImage
                    src={deal.thumbnailUrl}
                    alt={deal.name}
                    className="aspect-[4/3] w-full transition-transform group-hover:scale-105"
                  />
                  {off > 0 && <Badge className="absolute top-2 left-2">−{off}%</Badge>}
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className="font-medium group-hover:underline">{deal.name}</div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden /> {deal.cityName}
                  </div>
                  <StarRating value={deal.starRating} />
                  <div className="flex items-baseline gap-2 text-sm">
                    <s
                      className="text-muted-foreground"
                      aria-label={`Original price ${formatMoney(deal.originalPrice, deal.currency)}`}
                    >
                      {formatMoney(deal.originalPrice, deal.currency)}
                    </s>
                    <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(deal.discountedPrice, deal.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ night</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </CardGrid>
      )}
    </Section>
  )
}

function RecentlyVisited() {
  const status = useSession((s) => s.status)
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.visits.recentlyVisited,
    queryFn: () => visitsApi.recentlyVisited(5),
    enabled: status === 'authenticated',
  })

  // Auth-only on the API (kickoff §9 G16): anonymous users get a teaser instead.
  if (status !== 'authenticated') {
    return (
      <Section title="Recently visited">
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Log in to see the hotels you've viewed recently.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Log in</Link>
          </Button>
        </div>
      </Section>
    )
  }
  if (isError || (data && data.length === 0)) return null

  return (
    <Section title="Recently visited" subtitle="Pick up where you left off.">
      {isPending ? (
        <CardSkeletons />
      ) : (
        <CardGrid>
          {data.map((hotel) => (
            <Link
              key={hotel.hotelId}
              to={hotelLink(hotel.hotelId)}
              className="group rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <HotelImage
                src={hotel.thumbnailUrl}
                alt={hotel.name}
                className="aspect-[4/3] w-full rounded-lg"
              />
              <div className="mt-2 space-y-0.5">
                <div className="font-medium group-hover:underline">{hotel.name}</div>
                <div className="text-sm text-muted-foreground">{hotel.cityName}</div>
                <StarRating value={hotel.starRating} />
                <div className="text-sm">
                  <span className="font-semibold">{formatMoney(hotel.pricePerNight, hotel.currency)}</span>
                  <span className="text-muted-foreground"> / night</span>
                </div>
              </div>
            </Link>
          ))}
        </CardGrid>
      )}
    </Section>
  )
}

function TrendingDestinations() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.visits.trending,
    queryFn: () => visitsApi.trendingCities(5),
    staleTime: STATIC_STALE,
  })
  if (isError || (data && data.length === 0)) return null

  return (
    <Section title="Trending destinations" subtitle="The most-visited cities right now.">
      {isPending ? (
        <CardSkeletons />
      ) : (
        <CardGrid>
          {data.map((city) => (
            <Link
              key={city.cityId}
              to={`/search?${toSearchParams({ cityId: city.cityId, ...defaultStay(), ...DEFAULT_GUESTS })}`}
              className="group relative overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <HotelImage
                src={cityImage(city)}
                alt={city.cityName}
                className="aspect-[4/3] w-full transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3 text-lg font-semibold text-white drop-shadow">
                {city.cityName}
              </div>
            </Link>
          ))}
        </CardGrid>
      )}
    </Section>
  )
}

export function HomePage() {
  return (
    <div className="pb-12">
      <div className="bg-gradient-to-b from-primary/10 to-transparent">
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-10 text-center md:pt-20">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Find your next stay</h1>
          <p className="mt-3 text-muted-foreground">
            Hotels in the world's favourite cities, at the best prices.
          </p>
          <SearchBar initial={{ ...defaultStay(), ...DEFAULT_GUESTS }} className="mt-8 text-left" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-12 px-4">
        <FeaturedDeals />
        <RecentlyVisited />
        <TrendingDestinations />
      </div>
    </div>
  )
}
