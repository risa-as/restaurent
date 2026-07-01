'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    Printer, Download, Copy, Check, QrCode, Link2, Eye,
    Loader2, Table2, Grid3X3, List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPusherClient } from '@/lib/pusher';

interface TableRow {
    id: string;
    number: string;
    status: string;
}

type QRMode = 'order' | 'menu';
type ViewMode = 'grid' | 'list';

export default function QRSettingsPage() {
    const { toast } = useToast();
    const [tables, setTables] = useState<TableRow[]>([]);
    const [slug, setSlug] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#0f172a');
    const [restaurantName, setRestaurantName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [tenantId, setTenantId] = useState('');
    const [qrMode, setQrMode] = useState<QRMode>('order');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [customTableCount, setCustomTableCount] = useState(0);
    const printRef = useRef<HTMLDivElement>(null);

    const getQrUrl = useCallback((table: TableRow) => {
        if (qrMode === 'order') {
            return `${baseUrl}/${slug}/order?t=${table.id}`;
        }
        return `${baseUrl}/menu/${slug}?table=${encodeURIComponent(table.number)}`;
    }, [baseUrl, slug, qrMode]);

    useEffect(() => {
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = hostname.includes('localhost') ? 'http' : 'https';
        const base = `${protocol}://${hostname}${port}`;
        setBaseUrl(base);

        Promise.all([
            fetch('/api/tenant/settings').then(r => r.json()),
            fetch('/api/tables').then(r => r.json()).catch(() => ({ tables: [] })),
        ]).then(([tenantData, tablesData]) => {
            if (tenantData.tenant) {
                setSlug(tenantData.tenant.slug);
                setPrimaryColor(tenantData.tenant.primaryColor || '#0f172a');
                setRestaurantName(tenantData.tenant.name);
                setTenantId(tenantData.tenant.id);
            }
            if (Array.isArray(tablesData)) {
                setTables(tablesData);
                setCustomTableCount(tablesData.length);
            } else if (tablesData.tables) {
                setTables(tablesData.tables);
                setCustomTableCount(tablesData.tables.length);
            }
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    // ── Pusher: مزامنة حالة الطاولات في الوقت الفعلي ──────────────────────────
    useEffect(() => {
        if (!tenantId) return;
        const pusher = getPusherClient();
        if (!pusher) return;

        const updateStatus = (tableId: string, status: string) => {
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
        };

        const channel = pusher.subscribe(`tenant-${tenantId}-orders`);
        channel.bind('table-status-changed', (data: { tableId: string; status: string }) => {
            updateStatus(data.tableId, data.status);
        });
        channel.bind('table-dirty', (data: { tableId: string }) => {
            updateStatus(data.tableId, 'DIRTY');
        });

        return () => {
            channel.unbind('table-status-changed');
            channel.unbind('table-dirty');
            pusher.unsubscribe(`tenant-${tenantId}-orders`);
        };
    }, [tenantId]);

    const copyUrl = async (table: TableRow) => {
        const url = getQrUrl(table);
        await navigator.clipboard.writeText(url);
        setCopiedId(table.id);
        toast({ title: '✅ تم نسخ الرابط' });
        setTimeout(() => setCopiedId(null), 2000);
    };

    const downloadQr = (table: TableRow) => {
        const canvas = document.createElement('canvas');
        const size = 400;
        canvas.width = size;
        canvas.height = size + 80;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = primaryColor;
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(restaurantName, size / 2, 36);
        ctx.fillStyle = '#555';
        ctx.font = '18px Arial';
        ctx.fillText(`طاولة: ${table.number}`, size / 2, 64);
        const svgEl = document.getElementById(`qr-canvas-${table.id}`);
        if (!svgEl) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            ctx.drawImage(img, (size - 320) / 2, 80, 320, 320);
            URL.revokeObjectURL(url);
            const link = document.createElement('a');
            link.download = `qr-table-${table.number}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = url;
    };

    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const printWindow = window.open('', '', 'width=900,height=700');
        if (!printWindow) return;
        printWindow.document.write(`
            <html dir="rtl">
                <head>
                    <title>طباعة رموز QR — ${restaurantName}</title>
                    <style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fff; padding: 20px; }
                        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                        .qr-card {
                            border: 2px solid #e5e7eb;
                            border-radius: 16px;
                            padding: 24px 16px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 12px;
                            page-break-inside: avoid;
                            background: #fff;
                        }
                        .restaurant-name { font-size: 16px; font-weight: 700; color: ${primaryColor}; text-align: center; }
                        .scan-text { font-size: 12px; color: #6b7280; text-align: center; }
                        .table-badge {
                            background: ${primaryColor}15;
                            color: ${primaryColor};
                            border: 1.5px solid ${primaryColor}40;
                            padding: 4px 16px;
                            border-radius: 999px;
                            font-weight: 700;
                            font-size: 14px;
                        }
                        @media print {
                            .grid { grid-template-columns: repeat(3, 1fr); }
                        }
                    </style>
                </head>
                <body>
                    <div class="grid">${content}</div>
                    <script>window.onload = () => { window.print(); window.close(); }<\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>جاري تحميل الطاولات...</span>
                </div>
            </div>
        );
    }

    if (!slug) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                تعذّر تحميل بيانات المطعم.
            </div>
        );
    }

    const displayTables = tables.length > 0
        ? tables
        : Array.from({ length: customTableCount || 10 }, (_, i) => ({
            id: String(i + 1),   // نستخدم الرقم كـ ID ويضاً
            number: String(i + 1),
            status: 'AVAILABLE'
        }));

    const isVirtual = tables.length === 0;

    return (
        <div className="max-w-6xl space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b pb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: primaryColor + '20' }}>
                    <QrCode className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">رموز QR الذكي</h1>
                    <p className="text-sm text-muted-foreground">امكّن زبائنك من الطلب مباشرة عبر مسح رمز QR على طاولتهم</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-card border rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* نوع الرابط */}
                    <div className="space-y-2">
                        <Label>نوع الرابط</Label>
                        <div className="flex rounded-lg border overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setQrMode('order')}
                                className={cn(
                                    'flex-1 py-2 text-sm font-medium transition-colors',
                                    qrMode === 'order' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                )}
                            >
                                طلب مباشر
                            </button>
                            <button
                                type="button"
                                onClick={() => setQrMode('menu')}
                                className={cn(
                                    'flex-1 py-2 text-sm font-medium transition-colors border-r',
                                    qrMode === 'menu' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                )}
                            >
                                عرض المنيو
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {qrMode === 'order' ? 'يفتح صفحة الطلب مباشرة مع تعبئة الطاولة تلقائياً' : 'يعرض المنيو فقط للاطلاع'}
                        </p>
                    </div>

                    {/* عدد الطاولات */}
                    {tables.length === 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="tableCount">عدد الطاولات</Label>
                            <Input
                                id="tableCount"
                                type="number"
                                min={1}
                                max={100}
                                value={customTableCount}
                                onChange={e => setCustomTableCount(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">لا يوجد طاولات مسجّلة — استخدام أرقام تسلسلية</p>
                        </div>
                    )}

                    {/* عرض الرابط */}
                    <div className="space-y-2">
                        <Label>الرابط الأساسي</Label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border">
                            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-mono truncate text-muted-foreground" dir="ltr">
                                {baseUrl}/{slug}/...
                            </span>
                        </div>
                    </div>

                    {/* أزرار */}
                    <div className="flex gap-2">
                        <Button onClick={handlePrint} className="flex-1 gap-2">
                            <Printer className="w-4 h-4" />
                            طباعة الكل
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                            title="تبديل العرض"
                        >
                            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                    {/* إحصاء */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1 border-t">
                        <span className="flex items-center gap-1.5">
                            <Table2 className="w-4 h-4" />
                            {tables.length > 0 ? `${tables.length} طاولة مسجّلة` : `${customTableCount} طاولة (افتراضي)`}
                        </span>
                        {isVirtual && (
                            <span className="text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                                ⚠️ لا توجد طاولات مسجّلة — الروابط بأرقام تسلسلية فقط
                            </span>
                        )}
                        {tables.length > 0 && (
                            <>
                                <span className="w-px h-4 bg-border" />
                                <span className="text-green-600">{tables.filter(t => t.status === 'AVAILABLE').length} متاحة</span>
                                <span className="w-px h-4 bg-border" />
                                <span className="text-orange-600">{tables.filter(t => t.status === 'OCCUPIED').length} مشغولة</span>
                            </>
                        )}
                    </div>
            </div>

            {/* QR Grid */}
            <div className={cn(
                viewMode === 'grid'
                    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4'
                    : 'space-y-3'
            )}>
                {displayTables.map(table => (
                    <div
                        key={table.id}
                        className={cn(
                            'bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow',
                            viewMode === 'list' && 'flex items-center gap-4 p-4'
                        )}
                    >
                        {/* QR Code */}
                        <div className={cn(
                            'flex items-center justify-center bg-white',
                            viewMode === 'grid' ? 'p-4 pt-5' : 'shrink-0 p-2'
                        )}>
                            <QRCodeSVG
                                id={`qr-canvas-${table.id}`}
                                value={getQrUrl(table)}
                                size={viewMode === 'grid' ? 130 : 70}
                                fgColor={primaryColor}
                                level="H"
                                includeMargin={false}
                            />
                        </div>

                        {/* Info */}
                        <div className={cn(
                            viewMode === 'grid' ? 'p-3 pt-2 text-center border-t bg-muted/20' : 'flex-1 min-w-0'
                        )}>
                            <p className="font-bold text-sm truncate">طاولة {table.number}</p>
                            {table.status && (
                                <span className={cn(
                                    'text-xs px-2 py-0.5 rounded-full font-medium',
                                    table.status === 'AVAILABLE' && 'bg-green-100 text-green-700',
                                    table.status === 'OCCUPIED' && 'bg-orange-100 text-orange-700',
                                    table.status === 'DIRTY' && 'bg-red-100 text-red-700',
                                )}>
                                    {table.status === 'AVAILABLE' ? 'متاحة' : table.status === 'OCCUPIED' ? 'مشغولة' : 'تحتاج تنظيف'}
                                </span>
                            )}
                            {viewMode === 'list' && (
                                <p className="text-xs text-muted-foreground font-mono truncate mt-1" dir="ltr">
                                    {getQrUrl(table)}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className={cn(
                            'flex gap-1.5',
                            viewMode === 'grid' ? 'p-3 pt-0 justify-center' : 'shrink-0 pr-1'
                        )}>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyUrl(table)}
                                title="نسخ الرابط"
                            >
                                {copiedId === table.id
                                    ? <Check className="w-3.5 h-3.5 text-green-600" />
                                    : <Copy className="w-3.5 h-3.5" />
                                }
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => downloadQr(table)}
                                title="تحميل QR"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(getQrUrl(table), '_blank')}
                                title="معاينة الرابط"
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Hidden printable area */}
            <div ref={printRef} className="hidden">
                {displayTables.map(table => (
                    <div key={table.id} className="qr-card">
                        <div className="restaurant-name">{restaurantName}</div>
                        <div className="scan-text">امسح الرمز للطلب مباشرة</div>
                        <QRCodeSVG
                            value={getQrUrl(table)}
                            size={200}
                            fgColor={primaryColor}
                            level="H"
                            includeMargin
                        />
                        <div className="table-badge">طاولة: {table.number}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
