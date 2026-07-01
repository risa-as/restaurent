'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setTenantFeatureOverride } from '@/lib/actions/superadmin';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODULE_LABELS: Record<string, string> = {
  delivery: 'التوصيل',
  inventory: 'الموردون وطلبات الشراء',
  loyalty: 'نظام الولاء',
  qrMenu: 'قائمة QR',
  offers: 'العروض والخصومات',
  reservations: 'الحجوزات',
  advancedReports: 'التقارير المتقدمة',
  customBranding: 'الهوية التجارية',
  multiBranch: 'الأفرع المتعددة',
  analytics: 'التحليلات الذكية',
};

const MODULES = Object.keys(MODULE_LABELS);

interface Props {
  tenantId: string;
  planModules: Record<string, boolean>;        // plan defaults
  overrides: Record<string, boolean>;           // current per-tenant overrides
}

export function TenantFeatureOverrides({ tenantId, planModules, overrides: initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<Record<string, boolean>>(initial ?? {});
  const [pending, startTransition] = useTransition();
  const [busyModule, setBusyModule] = useState<string | null>(null);

  const apply = (module: string, value: boolean | null) => {
    setBusyModule(module);
    startTransition(async () => {
      const res = await setTenantFeatureOverride(tenantId, module, value);
      if ((res as any)?.error) {
        toast({ title: 'خطأ', description: (res as any).error, variant: 'destructive' });
      } else {
        setOverrides((res as any).overrides ?? {});
        toast({ title: 'تم التحديث', description: MODULE_LABELS[module] });
        router.refresh();
      }
      setBusyModule(null);
    });
  };

  const toggle = (module: string) => {
    const planDefault = !!planModules[module];
    const effective = module in overrides ? overrides[module] : planDefault;
    const next = !effective;
    // If the new value matches the plan default, drop the override (keep it clean)
    apply(module, next === planDefault ? null : next);
  };

  return (
    <div className="rounded-2xl border bg-card overflow-hidden" dir="rtl">
      <div className="px-5 py-3.5 border-b flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h2 className="font-semibold text-sm">تجاوز المميزات لهذا المطعم</h2>
      </div>
      <p className="px-5 pt-3 text-xs text-muted-foreground">
        فعّل أو عطّل أي ميزة لهذا المطعم بغضّ النظر عن خطته. التجاوز يتقدّم على إعداد الخطة.
      </p>
      <div className="p-3 space-y-1">
        {MODULES.map((module) => {
          const planDefault = !!planModules[module];
          const isOverridden = module in overrides;
          const effective = isOverridden ? overrides[module] : planDefault;
          const busy = pending && busyModule === module;
          return (
            <div key={module} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{MODULE_LABELS[module]}</p>
                <p className="text-[11px] text-muted-foreground">
                  حسب الخطة: {planDefault ? 'مفعّلة' : 'غير مفعّلة'}
                  {isOverridden && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold"> • تجاوز يدوي</span>
                  )}
                </p>
              </div>

              {isOverridden && !busy && (
                <button
                  onClick={() => apply(module, null)}
                  title="إزالة التجاوز (العودة لإعداد الخطة)"
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => toggle(module)}
                disabled={busy}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  effective ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                  busy && 'opacity-50',
                )}
                aria-pressed={effective}
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-white" />
                ) : (
                  <span
                    className={cn(
                      'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                      effective ? '-translate-x-1' : '-translate-x-6',
                    )}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
