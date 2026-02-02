import { getOffers, getMenuItems } from '@/lib/actions/menu';
import { OfferList } from '@/components/menu/offer-list';
import { OfferForm } from '@/components/menu/offer-form';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus } from 'lucide-react';

export default async function OffersPage() {
    const offers = await getOffers();
    const menuItems = await getMenuItems(); // Needed for the form selector

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Special Offers</h1>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Offer
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-md overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>New Special Offer</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4">
                            <OfferForm menuItems={menuItems} onSuccess={() => { }} />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <OfferList offers={offers} />
        </div>
    );
}
