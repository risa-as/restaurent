'use client';

import { Offer, MenuItem } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toggleOfferStatus } from '@/lib/actions/menu';

interface OfferListProps {
    offers: (Offer & { menuItems: MenuItem[] })[];
}

export function OfferList({ offers }: OfferListProps) {
    // Optimistic UI updates could be added here

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
                <Card key={offer.id} className={!offer.isActive ? "opacity-60" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-bold">
                            {offer.name}
                        </CardTitle>
                        <Switch
                            checked={offer.isActive}
                            onCheckedChange={async (val) => {
                                // In a real app, use useOptimistic or server action feedback
                                await toggleOfferStatus(offer.id, val);
                            }}
                        />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary mb-2">
                            {offer.discountPct}% OFF
                        </div>
                        <div className="text-xs text-muted-foreground mb-4">
                            {format(new Date(offer.startDate), 'MMM d')} - {format(new Date(offer.endDate), 'MMM d, yyyy')}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {offer.menuItems.map(item => (
                                <Badge key={item.id} variant="secondary" className="text-xs">
                                    {item.name}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
            {offers.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                    No active offers. Create one to get started.
                </div>
            )}
        </div>
    );
}
