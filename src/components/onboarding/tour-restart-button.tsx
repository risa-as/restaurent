'use client';

import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';

const LS_KEY = 'restaurant-tour-seen';

export function TourRestartButton() {
    const handleRestart = () => {
        localStorage.removeItem(LS_KEY);
        window.dispatchEvent(new Event('restart-tour'));
    };

    return (
        <Button
            variant="outline"
            onClick={handleRestart}
            className="gap-2 w-full sm:w-auto"
        >
            <PlayCircle className="w-4 h-4 text-primary" />
            إعادة الجولة التعريفية
        </Button>
    );
}
