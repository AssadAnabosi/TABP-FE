import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import type { HotelDto } from '@/api/types'
import { useSession } from '@/auth/session'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ApprovalBadge } from './ApprovalBadge'
import { HotelAmenitiesEditor } from './HotelAmenitiesEditor'
import { HotelApprovalActions } from './HotelApprovalActions'
import { HotelDetailsForm } from './HotelDetailsForm'
import { HotelImagesEditor } from './HotelImagesEditor'

interface HotelFormSheetProps {
  /** null = create. */
  hotel: HotelDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Create a hotel, or manage one: details, approval (Admin), amenities and images. */
export function HotelFormSheet({ hotel: snapshot, open, onOpenChange }: HotelFormSheetProps) {
  const isAdmin = useSession((s) => s.user?.role === 'Admin')
  const [tab, setTab] = useState('details')

  // Keep the sheet in sync after approve/reject/edits (the grid row is only a snapshot).
  const live = useQuery({
    queryKey: queryKeys.hotels.manage(snapshot?.id ?? 0),
    queryFn: () => hotelsApi.manage(snapshot!.id),
    enabled: open && snapshot !== null,
    initialData: snapshot ?? undefined,
    staleTime: 0,
  })
  const hotel = snapshot ? (live.data ?? snapshot) : null

  const close = () => onOpenChange(false)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setTab('details')
        onOpenChange(next)
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {hotel ? hotel.name : 'New hotel'}
            {hotel && <ApprovalBadge hotel={hotel} />}
          </SheetTitle>
          <SheetDescription>
            {hotel
              ? `${hotel.cityName} · owned by ${hotel.ownerName}`
              : isAdmin
                ? 'Hotels created by an admin are approved immediately.'
                : 'New hotels are reviewed by an admin before they appear in search.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {hotel?.approvalStatus === 'Rejected' && hotel.rejectionReason && (
            <Alert variant="destructive">
              <AlertTitle>Rejected</AlertTitle>
              <AlertDescription>{hotel.rejectionReason}</AlertDescription>
            </Alert>
          )}
          {hotel?.approvalStatus === 'Pending' && !isAdmin && (
            <Alert>
              <AlertDescription>Waiting for an admin to approve this hotel.</AlertDescription>
            </Alert>
          )}
          {hotel && isAdmin && <HotelApprovalActions hotel={hotel} />}

          {hotel ? (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="pt-2">
                <HotelDetailsForm
                  hotel={hotel}
                  active={open && tab === 'details'}
                  onSaved={close}
                  onCancel={close}
                />
              </TabsContent>
              <TabsContent value="amenities" className="pt-2">
                <HotelAmenitiesEditor hotel={hotel} />
              </TabsContent>
              <TabsContent value="images" className="pt-2">
                <HotelImagesEditor hotel={hotel} />
              </TabsContent>
            </Tabs>
          ) : (
            <HotelDetailsForm hotel={null} active={open} onSaved={close} onCancel={close} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
