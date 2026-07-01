"use client";

import {
  Order,
  OrderItem,
  MenuItem,
  Table,
  Delivery,
  User,
} from "@prisma/client";
import {
  Table as DSTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
// import { ar } from 'date-fns/locale'; // Removed unused
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer, RefreshCw } from "lucide-react";
import { getCashierHistory } from "@/lib/actions/cashier";
import { Receipt } from "@/components/orders/receipt";

type OrderWithDetails = Order & {
  items: (OrderItem & { menuItem: MenuItem })[];
  table: Table | null;
  delivery: (Delivery & { driver: User | null }) | null;
};

export function CashierHistory() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [printingOrder, setPrintingOrder] = useState<OrderWithDetails | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lazy-load history when this tab first mounts. History is no longer part of
  // the frequently-polled /api/cashier/data payload (it was a 200-row query on
  // every refresh); fetching it on demand keeps that endpoint light.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsRefreshing(true);
      try {
        const fresh = await getCashierHistory();
        if (!cancelled) setOrders(fresh);
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Effect to auto-print when printingOrder is set
  useEffect(() => {
    if (printingOrder) {
      window.print();
      // Reset after print dialog closes (simulated delay or afterprint event)
      // Ideally we wait for print.
    }
  }, [printingOrder]);

  // Clear printing order after print to allow re-printing same order
  useEffect(() => {
    const onAfterPrint = () => {
      setPrintingOrder(null);
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  const statusMap: Record<string, { label: string; color: string }> = {
    PENDING: { label: "انتظار", color: "bg-muted text-muted-foreground" },
    PREPARING: { label: "تحضير", color: "bg-accent/20 text-accent-foreground" },
    READY: {
      label: "جاهز",
      color: "bg-green-500/15 text-green-600 dark:text-green-400",
    },
    SERVED: {
      label: "بانتظار الدفع",
      color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    },
    COMPLETED: { label: "مدفوع", color: "bg-primary/15 text-primary" },
    CANCELLED: { label: "ملغي", color: "bg-destructive/15 text-destructive" },
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center bg-muted/40">
        <div>
          <h2 className="font-bold text-lg">سجل طلبات اليوم</h2>
          {orders.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{orders.length} طلب</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setIsRefreshing(true);
            const fresh = await getCashierHistory();
            setOrders(fresh);
            setIsRefreshing(false);
          }}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          تحديث
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <DSTable dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">رقم الطلب</TableHead>
              <TableHead className="text-center">الوقت</TableHead>
              <TableHead className="text-center">النوع</TableHead>
              <TableHead className="text-center">المبلغ</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  لا توجد طلبات مسجلة اليوم
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const status = statusMap[order.status] || statusMap.PENDING;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-bold">
                      #{order.orderNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "hh:mm a")}
                    </TableCell>
                    <TableCell>
                      {order.table
                        ? `طاولة ${order.table.number}`
                        : order.delivery
                          ? "توصيل"
                          : "سفري"}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {order.totalAmount.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border-0 ${status.color}`}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrintingOrder(order)}
                        title="طباعة الفاتورة"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </DSTable>
      </div>

      {/* Hidden Receipt for Printing */}
      {printingOrder && (
        <div style={{ display: "none" }}>
          <Receipt order={printingOrder} />
        </div>
      )}

      {/* 
                Explanation: standard display:none hides it from screen. 
                But window.print() prints what is visible. 
                Wait, Receipt component uses @media print { visibility: visible } strategy.
                It relies on #printable-receipt being in the DOM.
                If I wrap it in display:none, it might not print if parent is hidden.
                Actually, typical print css hides body and shows specific element.
                If specific element is inside display:none parent, it might remain hidden.
                Let's use a hidden container that is NOT display:none but maybe verified.
                Actually, existing Receipt logic uses global styles to hide body.
                So as long as Receipt is in DOM, it should work.
                However, to avoid visual clutter on screen, we can use `position: absolute; left: -9999px`.
            */}
      {printingOrder && (
        <div className="absolute -left-[9999px]">
          <Receipt order={printingOrder} />
        </div>
      )}
    </div>
  );
}
