'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface Batch {
    id: string;
    remainingQty: number;
    expiryDate: Date | null;
    material: { name: string; unit: string };
}

export function BatchExpiryList({ batches }: { batches: Batch[] }) {
    if (batches.length === 0) return null;

    return (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-sm text-orange-800 dark:text-orange-200">
                    تنبيهات انتهاء الصلاحية ({batches.length})
                </span>
            </div>
            {batches.map(batch => {
                const daysLeft = batch.expiryDate
                    ? differenceInDays(new Date(batch.expiryDate), new Date())
                    : null;
                const isExpired = daysLeft !== null && daysLeft < 0;
                const isCritical = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

                return (
                    <div
                        key={batch.id}
                        className={`flex items-center justify-between text-sm p-2 rounded ${
                            isExpired ? 'bg-gray-100 text-gray-500 dark:bg-gray-800' :
                            isCritical ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="font-medium">{batch.material.name}</span>
                            <span className="text-xs opacity-70">
                                ({batch.remainingQty} {batch.material.unit})
                            </span>
                        </div>
                        <span className={`font-bold font-mono text-xs ${isExpired ? 'text-gray-400' : ''}`}>
                            {isExpired
                                ? 'منتهي'
                                : daysLeft === 0
                                    ? 'اليوم!'
                                    : `${daysLeft} يوم`}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
