'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Don't show if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Show banner after 3 seconds
            setTimeout(() => setShow(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    async function handleInstall() {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setShow(false);
        setDeferredPrompt(null);
    }

    if (!show) return null;

    return (
        <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm
                       bg-card border shadow-xl rounded-2xl p-4 flex items-center gap-3
                       animate-in slide-in-from-bottom-4 duration-300"
            dir="rtl"
        >
            {/* App icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="app icon" className="w-12 h-12 rounded-xl shrink-0" />

            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">تثبيت التطبيق</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    أضف التطبيق للشاشة الرئيسية للوصول السريع
                </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleInstall}>
                    <Download className="w-3.5 h-3.5" />
                    تثبيت
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShow(false)}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
