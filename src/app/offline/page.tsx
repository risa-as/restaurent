'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center bg-background">
      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-6">
        <WifiOff className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">أنت غير متصل بالإنترنت</h1>
        <p className="text-muted-foreground max-w-sm">
          هذه الصفحة تحتاج إنترنت للعمل. تحقق من اتصالك ثم أعد المحاولة.
        </p>
      </div>

      <Button
        onClick={() => window.location.reload()}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        إعادة المحاولة
      </Button>

      <p className="text-xs text-muted-foreground">
        الصفحات التشغيلية (المطبخ، الكاشير، الكابتن، النادل) تعمل بدون إنترنت
      </p>
    </div>
  );
}
