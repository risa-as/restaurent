"use client";

import { useState, useEffect } from "react";
import { useFmt } from "@/contexts/number-locale-context";
import { ShiftCloseModal } from "./shift-close-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Clock, Banknote, CreditCard, TrendingUp } from "lucide-react";

interface Shift {
  id: string;
  openedAt: Date;
  openingCash: number;
  totalCash: number;
  totalCard: number;
  totalSales: number;
}

interface ShiftStatusBarProps {
  shift: Shift;
  cashierName?: string;
  onRefresh?: () => void | Promise<void>;
}

function useElapsed(openedAt: Date) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = Math.floor(
        (Date.now() - new Date(openedAt).getTime()) / 1000,
      );
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setElapsed(h > 0 ? `${h}س ${m}د` : `${m} دقيقة`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [openedAt]);

  return elapsed;
}

export function ShiftStatusBar({ shift, cashierName, onRefresh }: ShiftStatusBarProps) {
  const [closeOpen, setCloseOpen] = useState(false);
  const elapsed = useElapsed(shift.openedAt);
  const localeFmt = useFmt();
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
        ? `${(n / 1000).toFixed(0)}الف`
        : localeFmt(n);

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800 flex-wrap"
        dir="rtl"
      >
        {/* Status badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            وردية مفتوحة
          </span>
          {cashierName && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              — {cashierName}
            </span>
          )}
        </div>

        {/* Elapsed time */}
        <Badge
          variant="outline"
          className="gap-1 text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400 shrink-0"
        >
          <Clock className="w-3 h-3" />
          {elapsed}
        </Badge>

        {/* Running totals */}
        <div className="flex items-center gap-4 mr-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-sm">
            <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground text-xs">المبيعات:</span>
            <span className="font-mono font-bold text-primary">
              {fmt(shift.totalSales)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-muted-foreground text-xs">نقد:</span>
            <span className="font-mono font-bold text-emerald-600">
              {fmt(shift.totalCash)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-muted-foreground text-xs">بطاقة:</span>
            <span className="font-mono font-bold text-blue-600">
              {fmt(shift.totalCard)}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCloseOpen(true)}
            className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5 h-8 text-xs shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            إغلاق الوردية
          </Button>
        </div>
      </div>

      <ShiftCloseModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        shiftId={shift.id}
        openingCash={shift.openingCash}
        totalCash={shift.totalCash}
        totalCard={shift.totalCard}
        totalSales={shift.totalSales}
        onRefresh={onRefresh}
      />
    </>
  );
}
