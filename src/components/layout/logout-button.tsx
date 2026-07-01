'use client';

import { useTransition } from 'react';
import { signOut } from '@/lib/actions/auth';
import { clearOfflineCaches } from '@/lib/offline/db';
import { LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
    variant?: 'dropdown' | 'sidebar' | 'sidebar-collapsed';
}

export function LogoutButton({ variant = 'dropdown' }: LogoutButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleLogout = () => {
        startTransition(async () => {
            // Drop cached read data so the next tenant on this shared device can't
            // see the previous tenant's menu/tables/orders. Un-synced offline work
            // (sync_queue / live_orders) is intentionally preserved.
            await clearOfflineCaches().catch(() => { /* best effort */ });
            await signOut();
        });
    };

    if (variant === 'sidebar-collapsed') {
        return (
            <button
                onClick={handleLogout}
                disabled={isPending}
                title="تسجيل الخروج"
                className={cn(
                    'w-full flex items-center justify-center p-2 rounded-lg transition-colors',
                    'text-destructive hover:bg-destructive/10 disabled:opacity-60 disabled:cursor-not-allowed'
                )}
            >
                {isPending
                    ? <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
                    : <LogOut className="w-5 h-5 shrink-0" />
                }
            </button>
        );
    }

    if (variant === 'sidebar') {
        return (
            <button
                onClick={handleLogout}
                disabled={isPending}
                className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-bold transition-colors',
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                    'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
            >
                {isPending
                    ? <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
                    : <LogOut className="w-5 h-5 shrink-0" />
                }
                <span>{isPending ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
            </button>
        );
    }

    // dropdown variant (default)
    return (
        <button
            onClick={handleLogout}
            disabled={isPending}
            className={cn(
                'w-full text-right flex items-center gap-2 cursor-pointer',
                'text-destructive disabled:opacity-60 disabled:cursor-not-allowed',
                'transition-opacity'
            )}
        >
            {isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <LogOut className="h-4 w-4" />
            }
            <span>{isPending ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
        </button>
    );
}
