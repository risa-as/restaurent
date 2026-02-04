import { InventorySidebar } from '@/components/inventory/inventory-sidebar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Power } from 'lucide-react';

export default function InventoryLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-gray-50 text-right" dir="rtl">
            <InventorySidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">مطعم المنصور</span>
                        <span className="text-sm text-muted-foreground">| نظام إدارة المخزون</span>
                    </div>
                    <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary">
                        العودة للوحة التحكم
                    </Link>
                </header>
                <div className="flex-1 overflow-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
