'use client';

import { useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { toggleAnnouncement, deleteAnnouncement } from '@/lib/actions/superadmin';
import { useRouter } from 'next/navigation';

interface Announcement {
    id: string;
    title: string;
    body: string;
    type: string;
    targetPlan: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    createdBy: { name: string } | null;
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
    INFO: { label: 'ℹ️ معلومات', className: 'bg-blue-100 text-blue-700' },
    WARNING: { label: '⚠️ تحذير', className: 'bg-yellow-100 text-yellow-700' },
    UPDATE: { label: '✅ تحديث', className: 'bg-green-100 text-green-700' },
};

export default function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    if (announcements.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    لا توجد إعلانات بعد
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {announcements.map(ann => {
                const typeConfig = TYPE_CONFIG[ann.type] || TYPE_CONFIG.INFO;
                const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
                return (
                    <Card key={ann.id} className={`${!ann.isActive || isExpired ? 'opacity-60' : ''}`}>
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeConfig.className}`}>
                                            {typeConfig.label}
                                        </span>
                                        {ann.targetPlan && (
                                            <Badge variant="outline" className="text-xs">{ann.targetPlan}</Badge>
                                        )}
                                        {isExpired && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">منتهي</span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold">{ann.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{ann.body}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{new Date(ann.createdAt).toLocaleDateString('ar-SA')}</span>
                                        {ann.createdBy && <span>بواسطة: {ann.createdBy.name}</span>}
                                        {ann.expiresAt && <span>ينتهي: {new Date(ann.expiresAt).toLocaleDateString('ar-SA')}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => startTransition(async () => {
                                            await toggleAnnouncement(ann.id, !ann.isActive);
                                            router.refresh();
                                        })}
                                        disabled={isPending}
                                        title={ann.isActive ? 'تعطيل' : 'تفعيل'}
                                    >
                                        {ann.isActive
                                            ? <ToggleRight className="w-4 h-4 text-green-600" />
                                            : <ToggleLeft className="w-4 h-4 text-gray-400" />
                                        }
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        onClick={() => startTransition(async () => {
                                            await deleteAnnouncement(ann.id);
                                            router.refresh();
                                        })}
                                        disabled={isPending}
                                        title="حذف"
                                    >
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
