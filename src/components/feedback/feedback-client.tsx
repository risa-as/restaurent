'use client';

import { useState, useTransition, useCallback } from 'react';
import { deleteFeedback, getFeedbackList, getFeedbackStats, replyToFeedback } from '@/lib/actions/feedback';
import { Star, Trash2, ChevronLeft, ChevronRight, Filter, RefreshCw, TrendingUp, Users, ThumbsUp, MessageSquare, AlertTriangle, Reply, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { useChartColors } from '@/hooks/use-chart-colors';
import { useDateTimeFmt } from '@/contexts/number-locale-context';

/* ───── Types ───── */
type FeedbackItem = {
    id: string;
    rating: number;
    comment: string | null;
    staffReply: string | null;
    repliedAt: Date | null;
    createdAt: Date;
    order: {
        orderNumber: number;
        customer: { name: string | null; phone: string } | null;
    };
    branch: { name: string } | null;
};

type Stats = {
    averageRating: number;
    totalCount: number;
    distribution: Record<number, number>;
};

type ListResult = {
    items: FeedbackItem[];
    totalCount: number;
    totalPages: number;
    page: number;
};

type TrendPoint = { week: string; avg: number | null; count: number };

interface FeedbackClientProps {
    initialStats: Stats;
    initialList: ListResult;
    initialTrend: TrendPoint[];
    canReply?: boolean;
}

/* ───── Star Rating ───── */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
    const cls = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star
                    key={s}
                    className={`${cls} transition-colors ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                />
            ))}
        </div>
    );
}

/* ───── Rating Badge ───── */
function RatingBadge({ rating }: { rating: number }) {
    const colors: Record<number, string> = {
        5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        4: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        2: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        1: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${colors[rating] ?? ''}`}>
            {rating} <Star className="w-3 h-3 fill-current" />
        </span>
    );
}

/* ───── Trend Chart ───── */
function TrendChart({ trend }: { trend: TrendPoint[] }) {
    const colors = useChartColors();
    const hasData = trend.some(t => t.avg !== null);
    if (!hasData) return null;

    const hasBadWeek = trend.some(t => t.avg !== null && t.avg < 3);

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                    <span className="inline-block w-1 h-5 rounded-full bg-sky-400" />
                    اتجاه التقييمات (آخر 8 أسابيع)
                </h2>
                {hasBadWeek && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1">
                        <AlertTriangle className="h-3 w-3" />
                        أسبوع بتقييم منخفض
                    </div>
                )}
            </div>
            <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.4} />
                        <XAxis dataKey="week" axisLine={false} tickLine={false} style={{ fontSize: '11px' }} stroke={colors.muted} />
                        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false} style={{ fontSize: '11px' }} stroke={colors.muted} />
                        <ReferenceLine y={3} stroke={colors.warning} strokeDasharray="4 2" opacity={0.5} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '10px',
                                border: `1px solid ${colors.border}`,
                                backgroundColor: colors.tooltip.bg,
                                color: colors.tooltip.text,
                                fontSize: '12px',
                            }}
                            formatter={(v: any, _: any, props: any) => [
                                v !== null ? `${v} ★  (${props.payload.count} تقييم)` : 'لا توجد بيانات',
                                'متوسط التقييم',
                            ]}
                        />
                        <Line
                            type="monotone" dataKey="avg"
                            stroke={colors.warning} strokeWidth={2.5}
                            dot={{ r: 4, fill: colors.warning, strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                            connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ background: colors.warning }} />
                    متوسط التقييم الأسبوعي
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-px border-t-2 border-dashed" style={{ borderColor: colors.warning, opacity: 0.5 }} />
                    خط الرضا المقبول (3★)
                </div>
            </div>
        </div>
    );
}

/* ───── Reply Form ───── */
function ReplyForm({ feedbackId, existingReply, onDone }: { feedbackId: string; existingReply: string | null; onDone: () => void }) {
    const [text, setText] = useState(existingReply ?? '');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = () => {
        if (!text.trim()) return;
        startTransition(async () => {
            try {
                await replyToFeedback(feedbackId, text);
                onDone();
            } catch (e: any) {
                alert(e?.message ?? 'حدث خطأ');
            }
        });
    };

    return (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary mb-2">
                {existingReply ? 'تعديل الرد' : 'إضافة رد'}
            </p>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={2}
                placeholder="اكتب ردك على التقييم..."
                className="w-full text-sm rounded-lg border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center gap-2 mt-2">
                <button
                    onClick={handleSubmit}
                    disabled={isPending || !text.trim()}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                >
                    {isPending ? 'جاري الحفظ...' : 'حفظ الرد'}
                </button>
                <button onClick={onDone} className="text-xs text-muted-foreground hover:underline">
                    إلغاء
                </button>
            </div>
        </div>
    );
}

/* ───── Main Component ───── */
export function FeedbackClient({ initialStats, initialList, initialTrend, canReply = false }: FeedbackClientProps) {
    const dtFmt = useDateTimeFmt();
    const [stats, setStats] = useState<Stats>(initialStats);
    const [list, setList] = useState<ListResult>(initialList);
    const [isPending, startTransition] = useTransition();
    const [replyOpenId, setReplyOpenId] = useState<string | null>(null);

    // Filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [ratingFilter, setRatingFilter] = useState<number | undefined>();
    const [page, setPage] = useState(1);

    const refresh = useCallback(
        (newPage = 1, newRating = ratingFilter, newFrom = fromDate, newTo = toDate) => {
            startTransition(async () => {
                const from = newFrom ? new Date(newFrom) : undefined;
                const to = newTo ? new Date(newTo + 'T23:59:59') : undefined;

                const [newStats, newList] = await Promise.all([
                    getFeedbackStats(from, to),
                    getFeedbackList(from, to, newRating, newPage),
                ]);
                setStats(newStats);
                setList(newList);
                setPage(newPage);
            });
        },
        [ratingFilter, fromDate, toDate],
    );

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
        startTransition(async () => {
            const res = await deleteFeedback(id);
            if (res.success) {
                toast.success('تم حذف التقييم');
                refresh(page);
            }
        });
    };

    const handleFilterApply = () => {
        setPage(1);
        refresh(1, ratingFilter, fromDate, toDate);
    };

    const handleRatingFilterChange = (r: number | undefined) => {
        setRatingFilter(r);
        setPage(1);
        refresh(1, r, fromDate, toDate);
    };

    const positivePct =
        stats.totalCount > 0
            ? Math.round(((stats.distribution[4] + stats.distribution[5]) / stats.totalCount) * 100)
            : 0;

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Low Rating Alert ── */}
            {(() => {
                const lowCount = (stats.distribution[1] ?? 0) + (stats.distribution[2] ?? 0);
                const unanswered = list.items.filter(i => i.rating <= 2 && !i.staffReply).length;
                if (lowCount === 0) return null;
                return (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">
                                {lowCount} تقييم منخفض (★1-2)
                            </p>
                            {unanswered > 0 && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                    {unanswered} منها بدون رد من الفريق — يُنصح بالرد فوراً
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => handleRatingFilterChange(ratingFilter === 1 ? undefined : 1)}
                            className="text-xs text-red-600 dark:text-red-400 underline-offset-2 hover:underline"
                        >
                            عرض ★1
                        </button>
                    </div>
                );
            })()}

            {/* ── Trend Chart ── */}
            <TrendChart trend={initialTrend} />

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Average */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
                    <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
                    <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
                    <p className="text-4xl font-black relative z-10">
                        {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                    </p>
                    <StarRating rating={Math.round(stats.averageRating)} />
                    <p className="text-sm mt-1 text-amber-100 relative z-10">متوسط التقييم</p>
                    <TrendingUp className="absolute bottom-4 left-4 w-8 h-8 text-white/20" />
                </div>

                {/* Total */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
                    <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
                    <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
                    <p className="text-4xl font-black relative z-10">{stats.totalCount}</p>
                    <p className="text-sm mt-2 text-violet-100 relative z-10">إجمالي التقييمات</p>
                    <Users className="absolute bottom-4 left-4 w-8 h-8 text-white/20" />
                </div>

                {/* Positive */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 p-5 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
                    <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
                    <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
                    <p className="text-4xl font-black relative z-10">{positivePct}%</p>
                    <p className="text-sm mt-2 text-emerald-100 relative z-10">تقييمات إيجابية ★4-5</p>
                    <ThumbsUp className="absolute bottom-4 left-4 w-8 h-8 text-white/20" />
                </div>

                {/* With comment */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 p-5 text-white shadow-lg shadow-sky-200 dark:shadow-sky-900/30">
                    <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
                    <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
                    <p className="text-4xl font-black relative z-10">
                        {list.items.filter(i => i.comment).length}
                    </p>
                    <p className="text-sm mt-2 text-sky-100 relative z-10">تعليقات مكتوبة</p>
                    <MessageSquare className="absolute bottom-4 left-4 w-8 h-8 text-white/20" />
                </div>
            </div>

            {/* ── Distribution ── */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-5 rounded-full bg-amber-400" />
                    توزيع التقييمات
                </h2>
                <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = stats.distribution[star] ?? 0;
                        const pct = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                        const isActive = ratingFilter === star;
                        return (
                            <button
                                key={star}
                                onClick={() => handleRatingFilterChange(isActive ? undefined : star)}
                                className={`w-full flex items-center gap-3 text-sm rounded-xl px-2 py-1.5 transition-all ${isActive ? 'bg-amber-50 dark:bg-amber-950/30' : 'hover:bg-muted/50'}`}
                            >
                                <span className="w-14 text-right shrink-0 flex items-center gap-1 justify-end font-medium">
                                    {star} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                </span>
                                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${star >= 4 ? 'bg-emerald-400' : star === 3 ? 'bg-amber-400' : 'bg-red-400'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-10 text-left text-muted-foreground shrink-0">{count}</span>
                            </button>
                        );
                    })}
                </div>
                {ratingFilter && (
                    <button
                        onClick={() => handleRatingFilterChange(undefined)}
                        className="mt-3 text-xs text-primary hover:underline"
                    >
                        إلغاء الفلتر
                    </button>
                )}
            </div>

            {/* ── Filters ── */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Filter className="w-4 h-4" />
                        فلتر حسب التاريخ:
                    </div>
                    <div className="flex flex-wrap gap-3 flex-1">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground">من</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground">إلى</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleFilterApply}
                                disabled={isPending}
                                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                تطبيق
                            </button>
                            {(fromDate || toDate) && (
                                <button
                                    onClick={() => {
                                        setFromDate('');
                                        setToDate('');
                                        refresh(1, ratingFilter, '', '');
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                                >
                                    مسح
                                </button>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => refresh(page)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50 mr-auto"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
                        تحديث
                    </button>
                </div>
            </div>

            {/* ── List ── */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                        <span className="inline-block w-1 h-5 rounded-full bg-violet-400" />
                        قائمة التقييمات
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        {list.totalCount} تقييم
                    </span>
                </div>

                {isPending ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <RefreshCw className="w-6 h-6 animate-spin ml-2" />
                        جاري التحميل...
                    </div>
                ) : list.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                        <Star className="w-12 h-12 opacity-20" />
                        <p className="text-lg font-medium">لا توجد تقييمات</p>
                        <p className="text-sm">جرّب تغيير الفلاتر المحددة</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {list.items.map(fb => (
                            <div
                                key={fb.id}
                                className="px-6 py-4 hover:bg-muted/30 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Header row */}
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <StarRating rating={fb.rating} />
                                            <RatingBadge rating={fb.rating} />
                                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono">
                                                #{fb.order.orderNumber}
                                            </span>
                                            {fb.branch && (
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                                    {fb.branch.name}
                                                </span>
                                            )}
                                        </div>
                                        {/* Comment */}
                                        {fb.comment ? (
                                            <p className="text-sm text-foreground/80 mb-2 leading-relaxed">
                                                "{fb.comment}"
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic mb-2">
                                                بدون تعليق
                                            </p>
                                        )}
                                        {/* Customer + date */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                            {fb.order.customer?.name && (
                                                <span>👤 {fb.order.customer.name}</span>
                                            )}
                                            {fb.order.customer?.phone && (
                                                <span dir="ltr">{fb.order.customer.phone}</span>
                                            )}
                                            <span suppressHydrationWarning>
                                                {dtFmt(fb.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canReply ? (
                                            <button
                                                onClick={() => setReplyOpenId(replyOpenId === fb.id ? null : fb.id)}
                                                className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                                title="رد على التقييم"
                                            >
                                                <Reply className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <span
                                                className="p-2 rounded-lg text-muted-foreground cursor-not-allowed"
                                                title="الرد على التقييمات متاح من الخطة الأساسية فأعلى"
                                            >
                                                <Reply className="w-4 h-4 opacity-30" />
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDelete(fb.id)}
                                            disabled={isPending}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30"
                                            title="حذف التقييم"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Existing reply */}
                                {fb.staffReply && replyOpenId !== fb.id && (
                                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-primary mb-0.5">رد الفريق</p>
                                            <p className="text-sm">{fb.staffReply}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Reply form */}
                                {replyOpenId === fb.id && (
                                    <ReplyForm
                                        feedbackId={fb.id}
                                        existingReply={fb.staffReply}
                                        onDone={() => { setReplyOpenId(null); refresh(page); }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Pagination ── */}
                {list.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <button
                            onClick={() => {
                                const next = page + 1;
                                setPage(next);
                                refresh(next);
                            }}
                            disabled={page >= list.totalPages || isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-40"
                        >
                            <ChevronRight className="w-4 h-4" />
                            التالية
                        </button>
                        <span className="text-sm text-muted-foreground">
                            صفحة {page} من {list.totalPages}
                        </span>
                        <button
                            onClick={() => {
                                const prev = page - 1;
                                setPage(prev);
                                refresh(prev);
                            }}
                            disabled={page <= 1 || isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-40"
                        >
                            السابقة
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
