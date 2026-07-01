'use client';

import { useState, useEffect } from 'react';
import { X, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    body: string;
    type: string;
}

const TYPE_CONFIG: Record<string, {
    className: string;
    icon: React.ReactNode;
}> = {
    INFO: {
        className: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-100',
        icon: <Info className="w-4 h-4 shrink-0 text-blue-600" />,
    },
    WARNING: {
        className: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-100',
        icon: <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-600" />,
    },
    UPDATE: {
        className: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/40 dark:border-green-800 dark:text-green-100',
        icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />,
    },
};

export default function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
            setDismissed(new Set(stored));
        } catch { /* ignore */ }
    }, []);

    function dismiss(id: string) {
        const nextArr = Array.from(dismissed).concat(id);
        const next = new Set<string>(nextArr);
        setDismissed(next);
        try {
            localStorage.setItem('dismissed_announcements', JSON.stringify(nextArr));
        } catch { /* ignore */ }
    }

    const visible = announcements.filter(a => !dismissed.has(a.id));
    if (visible.length === 0) return null;

    return (
        <div className="space-y-2 mb-4">
            {visible.map(ann => {
                const config = TYPE_CONFIG[ann.type] || TYPE_CONFIG.INFO;
                return (
                    <div
                        key={ann.id}
                        className={`flex items-start gap-3 border rounded-lg px-4 py-3 ${config.className}`}
                    >
                        {config.icon}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{ann.title}</p>
                            <p className="text-sm mt-0.5 opacity-90">{ann.body}</p>
                        </div>
                        <button
                            onClick={() => dismiss(ann.id)}
                            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                            aria-label="إخفاء"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
