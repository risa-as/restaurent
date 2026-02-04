'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface RelativeTimeProps {
    date: Date | string;
    addSuffix?: boolean;
}

export function RelativeTime({ date, addSuffix = true }: RelativeTimeProps) {
    const [timeString, setTimeString] = useState<string | null>(null);

    useEffect(() => {
        const updateTime = () => {
            setTimeString(formatDistanceToNow(new Date(date), { addSuffix, locale: ar }));
        };

        updateTime();
        // Update every minute
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [date, addSuffix]);

    if (!timeString) {
        // Render a placeholder or nothing during SSR/initial hydration to strictly match
        // Or render a static date if semantic HTML is needed, but here we want relative.
        return <span className="opacity-0">جاري التحميل...</span>;
    }

    return <span>{timeString}</span>;
}
