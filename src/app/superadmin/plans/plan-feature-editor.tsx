'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePlanConfig } from '@/lib/actions/superadmin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'] as const;
const PLAN_LABELS: Record<string, string> = { TRIAL: 'تجريبية', BASIC: 'أساسية', PRO: 'متقدمة', ENTERPRISE: 'مؤسسات' };

const MODULE_LABELS: Record<string, string> = {
  delivery: 'التوصيل',
  inventory: 'الموردون وطلبات الشراء',
  loyalty: 'نظام الولاء',
  qrMenu: 'قائمة QR',
  offers: 'العروض',
  reservations: 'الحجوزات',
  advancedReports: 'التقارير المتقدمة',
  customBranding: 'الهوية التجارية',
  multiBranch: 'الأفرع المتعددة',
  analytics: 'التحليلات',
};
const MODULES = Object.keys(MODULE_LABELS);

const LIMITS: { key: 'maxOrdersPerMonth' | 'maxMenuItems' | 'maxStaffAccounts'; label: string }[] = [
  { key: 'maxOrdersPerMonth', label: 'الطلبات / شهر' },
  { key: 'maxMenuItems', label: 'أصناف القائمة' },
  { key: 'maxStaffAccounts', label: 'الموظفون' },
];

interface PlanCfg {
  modules?: Record<string, boolean>;
  maxOrdersPerMonth?: number | null;
  maxMenuItems?: number | null;
  maxStaffAccounts?: number | null;
}

export function PlanFeatureEditor({ configs: initial }: { configs: Record<string, PlanCfg> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const normalize = (): Record<string, Required<PlanCfg>> => {
    const out: Record<string, any> = {};
    for (const p of PLANS) {
      const c = initial[p] ?? {};
      const mods: Record<string, boolean> = {};
      for (const m of MODULES) mods[m] = !!(c.modules as any)?.[m];
      out[p] = {
        modules: mods,
        maxOrdersPerMonth: c.maxOrdersPerMonth ?? null,
        maxMenuItems: c.maxMenuItems ?? null,
        maxStaffAccounts: c.maxStaffAccounts ?? null,
      };
    }
    return out;
  };

  const [cfg, setCfg] = useState<Record<string, Required<PlanCfg>>>(normalize);

  // Re-sync local state whenever the server sends fresh configs (after a save +
  // router.refresh, or any revalidation). Without this the editor keeps its first
  // snapshot and drifts from the DB, showing stale toggle positions.
  const serverSnapshot = JSON.stringify(initial);
  const lastSyncedRef = useRef(serverSnapshot);
  useEffect(() => {
    if (lastSyncedRef.current !== serverSnapshot) {
      lastSyncedRef.current = serverSnapshot;
      setCfg(normalize());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSnapshot]);

  const toggle = (plan: string, mod: string) =>
    setCfg(c => ({ ...c, [plan]: { ...c[plan], modules: { ...c[plan].modules!, [mod]: !c[plan].modules![mod] } } }));

  const setLimit = (plan: string, key: string, val: string) =>
    setCfg(c => {
      const t = val.trim();
      const n = Number(t);
      // empty, -1, or any negative = unlimited (null); 0+ = a real limit
      const value = t === '' || isNaN(n) || n < 0 ? null : Math.floor(n);
      return { ...c, [plan]: { ...c[plan], [key]: value } };
    });

  const save = () =>
    start(async () => {
      for (const plan of PLANS) {
        const c = cfg[plan];
        const res = await updatePlanConfig(plan, {
          modules: c.modules,
          maxOrdersPerMonth: c.maxOrdersPerMonth,
          maxMenuItems: c.maxMenuItems,
          maxStaffAccounts: c.maxStaffAccounts,
        });
        if ((res as any)?.error) {
          toast({ title: 'خطأ', description: (res as any).error, variant: 'destructive' });
          return;
        }
      }
      toast({ title: 'تم الحفظ', description: 'ميزات وحدود الخطط محدّثة وفعّالة فوراً' });
      router.refresh();
    });

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="w-4 h-4" />
        تعديل ميزات الخطط
      </Button>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> تعديل ميزات وحدود الخطط
          </CardTitle>
          <CardDescription>التغييرات تنعكس فوراً على كل المطاعم. اكتب <span className="font-bold text-emerald-600">-1</span> في حقل الحد = غير محدود.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>إغلاق</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0" dir="rtl">
            <thead>
              <tr>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground sticky right-0 bg-card">الميزة / الحد</th>
                {PLANS.map(p => (
                  <th key={p} className="px-3 py-2 text-center text-xs font-bold">{PLAN_LABELS[p]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* الحدود الرقمية */}
              {LIMITS.map(({ key, label }) => (
                <tr key={key} className="border-t">
                  <td className="px-3 py-2 font-medium sticky right-0 bg-card">{label}</td>
                  {PLANS.map(p => (
                    <td key={p} className="px-2 py-1.5 text-center">
                      <Input
                        type="number"
                        min={-1}
                        dir="ltr"
                        placeholder="-1"
                        title={cfg[p][key] == null ? 'غير محدود' : undefined}
                        value={cfg[p][key] == null ? -1 : cfg[p][key]!}
                        onChange={e => setLimit(p, key, e.target.value)}
                        className={cn('h-8 w-20 mx-auto text-center', cfg[p][key] == null && 'text-emerald-600 font-bold')}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {/* الوحدات */}
              {MODULES.map(mod => (
                <tr key={mod} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 sticky right-0 bg-card">{MODULE_LABELS[mod]}</td>
                  {PLANS.map(p => {
                    const on = cfg[p].modules![mod];
                    return (
                      <td key={p} className="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(p, mod)}
                          aria-pressed={on}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            on ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                          )}
                        >
                          <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform', on ? '-translate-x-1' : '-translate-x-[18px]')} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={pending} className="gap-2">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            حفظ ميزات الخطط
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
