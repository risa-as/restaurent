'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="تغيير مظهر التطبيق">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">تغيير الثيم</span>
                </Button>
            </DropdownMenuTrigger>
            {/* RTL: align="start" is visually right-aligned in RTL layouts */}
            <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-accent/50' : ''}>
                    <Sun className="me-2 h-4 w-4" />
                    فاتح
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'bg-accent/50' : ''}>
                    <Moon className="me-2 h-4 w-4" />
                    داكن
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'bg-accent/50' : ''}>
                    <Monitor className="me-2 h-4 w-4" />
                    تلقائي
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
