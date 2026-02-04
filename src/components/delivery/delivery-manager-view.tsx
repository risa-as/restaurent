'use client';

import { Delivery, Order, OrderItem, MenuItem, User } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeliveryDashboard } from '@/components/delivery/delivery-dashboard';
import { DeliveryStats } from '@/components/delivery/delivery-stats';
import { DriverFinance } from '@/components/delivery/driver-finance';
import { DriverHistory } from '@/components/delivery/driver-history';
import { Badge } from '@/components/ui/badge';

type DeliveryWithRelations = Delivery & {
    order: Order & { items: (OrderItem & { menuItem: MenuItem })[] };
    driver: User | null;
};

interface DeliveryManagerViewProps {
    activeDeliveries: DeliveryWithRelations[]; // For Dashboard (All, grouped by status)
    historyDeliveries: DeliveryWithRelations[]; // For Stats (All Delivered)
    unpaidDeliveries: DeliveryWithRelations[]; // For Finance (Delivered & Unpaid)
    drivers: User[];
}

export function DeliveryManagerView({ activeDeliveries, historyDeliveries, unpaidDeliveries, drivers }: DeliveryManagerViewProps) {
    return (
        <Tabs defaultValue="dashboard" className="h-full flex flex-col space-y-6" dir="rtl">
            <div className="flex items-center justify-between border-b pb-0">
                <TabsList className="bg-transparent p-0 gap-8 h-auto w-full justify-start overflow-x-auto">
                    <TabsTrigger
                        value="dashboard"
                        className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground text-base transition-all font-bold"
                    >
                        اللوحة الرئيسية
                    </TabsTrigger>

                    <TabsTrigger
                        value="finance"
                        className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground text-base transition-all font-bold flex gap-2"
                    >
                        الحسابات والعهد
                        {unpaidDeliveries.length > 0 && (
                            <Badge variant="destructive" className="h-5 px-1.5 rounded-full text-[10px]">
                                {unpaidDeliveries.length}
                            </Badge>
                        )}
                    </TabsTrigger>

                    <TabsTrigger
                        value="history"
                        className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground text-base transition-all font-bold"
                    >
                        سجل السائقين
                    </TabsTrigger>

                    <TabsTrigger
                        value="stats"
                        className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground text-base transition-all font-bold"
                    >
                        التحليلات والأداء
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="dashboard" className="flex-1 mt-0">
                <DeliveryDashboard deliveries={activeDeliveries} drivers={drivers} />
            </TabsContent>

            <TabsContent value="finance" className="mt-0 h-full overflow-auto">
                <DriverFinance deliveries={unpaidDeliveries} />
            </TabsContent>

            <TabsContent value="history" className="mt-0 h-full overflow-auto">
                <DriverHistory deliveries={historyDeliveries} drivers={drivers} />
            </TabsContent>

            <TabsContent value="stats" className="mt-0 h-full overflow-auto">
                <DeliveryStats deliveries={historyDeliveries} drivers={drivers} />
            </TabsContent>
        </Tabs>
    );
}
