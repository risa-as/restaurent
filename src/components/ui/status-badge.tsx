import { cn } from '@/lib/utils';

type StatusKey =
    | 'PENDING' | 'APPROVED' | 'REJECTED'
    | 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'SUSPENDED' | 'EXPIRED'
    | 'READY' | 'SERVED' | 'DIRTY' | 'AVAILABLE' | 'OCCUPIED'
    | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
    | string;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    PENDING:    { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    APPROVED:   { label: 'مقبول',        className: 'bg-green-100 text-green-800 border-green-200' },
    REJECTED:   { label: 'مرفوض',        className: 'bg-red-100 text-red-800 border-red-200' },
    ACTIVE:     { label: 'نشط',           className: 'bg-green-100 text-green-800 border-green-200' },
    TRIAL:      { label: 'تجريبي',        className: 'bg-blue-100 text-blue-800 border-blue-200' },
    PAST_DUE:   { label: 'متأخر',         className: 'bg-orange-100 text-orange-800 border-orange-200' },
    SUSPENDED:  { label: 'موقوف',         className: 'bg-red-100 text-red-800 border-red-200' },
    EXPIRED:    { label: 'منتهي',         className: 'bg-gray-100 text-gray-700 border-gray-200' },
    READY:      { label: 'جاهز',          className: 'bg-green-100 text-green-800 border-green-200' },
    SERVED:     { label: 'تم التقديم',    className: 'bg-blue-100 text-blue-800 border-blue-200' },
    DIRTY:      { label: 'يحتاج تنظيف',  className: 'bg-orange-100 text-orange-800 border-orange-200' },
    AVAILABLE:  { label: 'متاح',          className: 'bg-green-100 text-green-800 border-green-200' },
    OCCUPIED:   { label: 'مشغول',         className: 'bg-red-100 text-red-800 border-red-200' },
    CONFIRMED:  { label: 'مؤكد',          className: 'bg-green-100 text-green-800 border-green-200' },
    CANCELLED:  { label: 'ملغي',          className: 'bg-gray-100 text-gray-700 border-gray-200' },
    COMPLETED:  { label: 'مكتمل',         className: 'bg-blue-100 text-blue-800 border-blue-200' },
    IN_KITCHEN: { label: 'في المطبخ',     className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    PAID:       { label: 'مدفوع',         className: 'bg-green-100 text-green-800 border-green-200' },
};

interface StatusBadgeProps {
    status: StatusKey;
    customLabel?: string;
    className?: string;
}

export function StatusBadge({ status, customLabel, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] ?? {
        label: status,
        className: 'bg-muted text-muted-foreground border-border',
    };

    return (
        <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
            config.className,
            className
        )}>
            {customLabel ?? config.label}
        </span>
    );
}
