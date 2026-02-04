import { ChefHat } from 'lucide-react';
import { KitchenNav } from '@/components/kitchen/kitchen-nav';

export default function KitchenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full flex flex-col bg-background">
            <header className="border-b bg-card px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <ChefHat className="w-8 h-8 text-primary h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">بوابة الطهي</h1>
                        <p className="text-xs text-muted-foreground">نظام إدارة المطبخ الذكي</p>
                    </div>
                </div>

                <KitchenNav />
            </header>

            <main className="flex-1 overflow-hidden p-6 bg-gray-50/50">
                <div className="h-full max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
