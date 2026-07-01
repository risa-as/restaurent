'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
    className?: string;
    onRefresh?: () => void;
}

export function RefreshButton({ className, onRefresh }: RefreshButtonProps) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (onRefresh) {
            onRefresh();
            setTimeout(() => setIsRefreshing(false), 1000);
        } else {
            router.refresh();
            setTimeout(() => setIsRefreshing(false), 1000);
        }
    };

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className={cn(className)}
            title="تحديث البيانات"
        >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
    );
}
