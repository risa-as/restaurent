'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { approveVoidRequest, rejectVoidRequest, getPendingVoidRequests } from '@/lib/actions/void-requests';
import { getPusherClient } from '@/lib/pusher';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

type VoidRequest = Awaited<ReturnType<typeof getPendingVoidRequests>>[number];

interface Props {
    initialRequests: VoidRequest[];
    branchId?: string;
    tenantId: string;
}

export function VoidRequestManager({ initialRequests, branchId, tenantId }: Props) {
    const fmt = useFmt();
    const { toast } = useToast();
    const router = useRouter();
    const [requests, setRequests] = useState(initialRequests);
    const [isPending, startTransition] = useTransition();

    // Subscribe to new void requests via Pusher
    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`manager-${branchId ?? tenantId}`);
        channel.bind('void-requested', () => router.refresh());
        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`manager-${branchId ?? tenantId}`);
        };
    }, [branchId, tenantId, router]);

    const handleApprove = (id: string) => {
        startTransition(async () => {
            const result = await approveVoidRequest(id);
            if ('error' in result && result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم الموافقة على الإلغاء' });
                setRequests(prev => prev.filter(r => r.id !== id));
            }
        });
    };

    const handleReject = (id: string) => {
        startTransition(async () => {
            const result = await rejectVoidRequest(id);
            if ('error' in result && result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم رفض طلب الإلغاء' });
                setRequests(prev => prev.filter(r => r.id !== id));
            }
        });
    };

    if (requests.length === 0) return null;

    return (
        <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="w-4 h-4" />
                    طلبات إلغاء معلقة
                    <Badge className="bg-orange-600 text-white">{requests.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {requests.map(req => (
                    <div key={req.id} className="bg-background rounded-xl border p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                            <div>
                                <span className="font-bold">طلب #{req.order.orderNumber}</span>
                                {req.order.table && (
                                    <Badge variant="outline" className="mr-2 text-xs">طاولة {req.order.table.number}</Badge>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                    الموظف: {req.requestedBy.name}
                                </p>
                                {req.reason && (
                                    <p className="text-sm text-muted-foreground">السبب: {req.reason}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    {req.order.items.slice(0, 3).map(i => `${i.quantity}× ${i.menuItem.name}`).join(' · ')}
                                    {req.order.items.length > 3 && '...'}
                                </p>
                            </div>
                            <span className="font-bold text-base shrink-0">{fmt(req.order.totalAmount)} د.ع</span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1 gap-1"
                                onClick={() => handleApprove(req.id)}
                                disabled={isPending}
                            >
                                <CheckCircle className="w-4 h-4" />
                                موافقة
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-1"
                                onClick={() => handleReject(req.id)}
                                disabled={isPending}
                            >
                                <XCircle className="w-4 h-4" />
                                رفض
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
