'use client';

import { Table } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MoreHorizontal, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateTableStatus } from '@/lib/actions/captain';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTransition } from 'react';

// Map status to Arabic and Colors
const statusConfig = {
    AVAILABLE: { label: 'متاح', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    OCCUPIED: { label: 'مشغول', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    RESERVED: { label: 'محجوز', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    DIRTY: { label: 'تنظيف', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Trash2 },
};

export function TableCard({ table }: { table: Table }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleStatusChange = (status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY') => {
        startTransition(async () => {
            const res = await updateTableStatus(table.id, status);
            if (res.error) {
                toast({ variant: "destructive", title: "خطأ", description: res.error });
            } else {
                toast({ title: "تم التحديث", description: `تم تغيير حالة الطاولة ${table.number}` });
            }
        });
    };

    const config = statusConfig[table.status] || statusConfig.AVAILABLE;
    const StatusIcon = config.icon;

    return (
        <Card className={cn("transition-all relative", isPending && "opacity-50")}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">طاولة {table.number}</CardTitle>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange('AVAILABLE')}>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span>متاح</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('OCCUPIED')}>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span>مشغول</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('RESERVED')}>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                <span>محجوز</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('DIRTY')}>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                <span>تنظيف</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-3">
                    <Badge variant="outline" className={cn("w-fit px-2 py-1 gap-1", config.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                    </Badge>
                    <div className="flex items-center text-muted-foreground text-sm gap-1">
                        <Users className="w-4 h-4" />
                        <span>{table.capacity} مقاعد</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
