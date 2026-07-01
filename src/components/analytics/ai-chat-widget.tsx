'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Bot, X, Send, Copy, Check, Star, StarOff,
    RefreshCw, AlertTriangle, TrendingDown, Package, Sparkles, Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = { role: 'user' | 'assistant'; content: string; id: string };

type ContextSummary = {
    todaySales: number;
    yesterdaySales: number;
    ordersToday: number;
    lowStockCount: number;
    topItem: string | null;
    aiDailyLimit: number;
    aiUsageToday: number;
    aiRemaining: number | null; // null = unlimited
};

type ProactiveAlert = { id: string; icon: React.ReactNode; text: string; severity: 'warning' | 'info' };

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_HISTORY = 'ai-chat-history';
const LS_FAVORITES = 'ai-chat-favorites';
const LS_CONTEXT = 'ai-chat-context';
const MAX_HISTORY = 20;

function loadHistory(): Message[] {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); } catch { return []; }
}
function saveHistory(msgs: Message[]) {
    localStorage.setItem(LS_HISTORY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
}
function loadFavorites(): string[] {
    try { return JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]'); } catch { return []; }
}
function saveFavorites(favs: string[]) {
    localStorage.setItem(LS_FAVORITES, JSON.stringify(favs));
}
function loadContextFacts(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(LS_CONTEXT) || '{}'); } catch { return {}; }
}

// ─── Smart suggestions ────────────────────────────────────────────────────────

function getSmartSuggestions(hour: number, dayOfMonth: number, hasLowStock: boolean): string[] {
    const suggestions: string[] = [];

    if (hour >= 6 && hour < 12) suggestions.push('ما كانت مبيعات أمس؟');
    else if (hour >= 12 && hour < 17) suggestions.push('كيف أداء اليوم حتى الآن؟');
    else suggestions.push('ما إجمالي مبيعات اليوم؟');

    if (dayOfMonth >= 25) suggestions.push('ما ربح هذا الشهر؟');
    else suggestions.push('مقارنة الأسبوع الحالي بالماضي');

    if (hasLowStock) suggestions.push('ما المنتجات التي تنفد من المخزون؟');
    else suggestions.push('ما هي ساعات الذروة؟');

    suggestions.push('ما أكثر الأصناف مبيعاً؟');

    return suggestions.slice(0, 4);
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
    const [copied, setCopied] = useState(false);
    const isUser = msg.role === 'user';

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className={cn('group flex gap-2 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
            {/* Avatar */}
            <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold',
                isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white',
            )}>
                {isUser ? 'أنت' : <Sparkles className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={cn(
                'relative max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border rounded-tl-sm',
            )}>
                {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none
                        prose-table:text-xs prose-th:p-2 prose-td:p-2
                        prose-table:border prose-th:border prose-td:border
                        prose-table:rounded prose-headings:text-primary
                        prose-strong:text-foreground" dir="rtl">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                )}

                {/* Copy button — appears on hover */}
                <button
                    onClick={handleCopy}
                    className={cn(
                        'absolute -bottom-2 opacity-0 group-hover:opacity-100 transition-opacity',
                        'bg-muted border rounded-full p-1 shadow-sm',
                        isUser ? 'left-2' : 'right-2',
                    )}
                    title="نسخ"
                >
                    {copied
                        ? <Check className="w-3 h-3 text-green-500" />
                        : <Copy className="w-3 h-3 text-muted-foreground" />}
                </button>
            </div>
        </div>
    );
}

// ─── Streaming bubble ─────────────────────────────────────────────────────────

function StreamingBubble({ content }: { content: string }) {
    return (
        <div className="flex gap-2 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-gradient-to-br from-yellow-400 to-orange-500">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div className="max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-card border shadow-sm">
                {content ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none
                        prose-table:text-xs prose-th:p-2 prose-td:p-2
                        prose-table:border prose-th:border prose-td:border
                        prose-headings:text-primary prose-strong:text-foreground" dir="rtl">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                    </div>
                ) : (
                    <div className="flex gap-1 items-center h-5">
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function AIChatWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [contextFacts, setContextFacts] = useState<Record<string, string>>({});
    const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);
    const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
    const [notConfigured, setNotConfigured] = useState(false);
    const [limitExceeded, setLimitExceeded] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // ── Load localStorage on mount ────────────────────────────────────────────
    useEffect(() => {
        setMessages(loadHistory());
        setFavorites(loadFavorites());
        setContextFacts(loadContextFacts());
    }, []);

    // ── Fetch context summary when panel opens ────────────────────────────────
    useEffect(() => {
        if (!open || contextSummary) return;
        fetch('/api/ai-chat')
            .then(r => r.ok ? r.json() : null)
            .then((data: ContextSummary | null) => {
                if (!data) return;
                setContextSummary(data);

                // Build proactive alerts
                const newAlerts: ProactiveAlert[] = [];
                const { todaySales, yesterdaySales, lowStockCount, ordersToday } = data;

                if (yesterdaySales > 0 && todaySales < yesterdaySales * 0.7) {
                    const drop = Math.round(((yesterdaySales - todaySales) / yesterdaySales) * 100);
                    newAlerts.push({
                        id: 'sales-drop',
                        icon: <TrendingDown className="w-4 h-4" />,
                        text: `مبيعات اليوم أقل من أمس بـ ${drop}%`,
                        severity: 'warning',
                    });
                }
                if (lowStockCount > 2) {
                    newAlerts.push({
                        id: 'low-stock',
                        icon: <Package className="w-4 h-4" />,
                        text: `${lowStockCount} أصناف من المخزون على وشك النفاد`,
                        severity: 'warning',
                    });
                }
                if (ordersToday === 0) {
                    newAlerts.push({
                        id: 'no-orders',
                        icon: <AlertTriangle className="w-4 h-4" />,
                        text: 'لا توجد طلبات مسجلة اليوم حتى الآن',
                        severity: 'info',
                    });
                }
                setAlerts(newAlerts);
            })
            .catch(() => null);
    }, [open, contextSummary]);

    // ── Scroll to bottom on new messages ─────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    // ── Focus input when panel opens ──────────────────────────────────────────
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isStreaming) return;

        const userMsg: Message = { role: 'user', content: trimmed, id: Date.now().toString() };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        saveHistory(nextMessages);
        setInput('');
        setIsStreaming(true);
        setStreamingContent('');
        setNotConfigured(false);
        setLimitExceeded(false);

        try {
            const res = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
                    contextFacts,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                if (err.code === 'NOT_CONFIGURED') {
                    setNotConfigured(true);
                    setIsStreaming(false);
                    return;
                }
                if (err.code === 'DAILY_LIMIT_EXCEEDED') {
                    setLimitExceeded(true);
                    setIsStreaming(false);
                    // update remaining in contextSummary
                    setContextSummary(prev => prev ? { ...prev, aiRemaining: 0 } : prev);
                    return;
                }
                throw new Error(err.error || 'فشل الطلب');
            }

            if (!res.body) throw new Error('No response body');

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let accumulated = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value, { stream: true });
                setStreamingContent(accumulated);
            }

            // Commit streaming content as assistant message
            const assistantMsg: Message = {
                role: 'assistant',
                content: accumulated,
                id: (Date.now() + 1).toString(),
            };
            const finalMessages = [...nextMessages, assistantMsg];
            setMessages(finalMessages);
            saveHistory(finalMessages);
            setStreamingContent('');
            // Decrement remaining counter locally
            setContextSummary(prev =>
                prev && prev.aiRemaining !== null
                    ? { ...prev, aiUsageToday: prev.aiUsageToday + 1, aiRemaining: Math.max(0, prev.aiRemaining - 1) }
                    : prev
            );

        } catch (e: any) {
            const errMsg: Message = {
                role: 'assistant',
                content: `⚠️ ${e.message || 'حدث خطأ، يرجى المحاولة لاحقاً'}`,
                id: (Date.now() + 1).toString(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsStreaming(false);
        }
    }, [messages, isStreaming, contextFacts]);

    // ── Keyboard submit ───────────────────────────────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    // ── Favorites ─────────────────────────────────────────────────────────────
    const toggleFavorite = (q: string) => {
        const next = favorites.includes(q)
            ? favorites.filter(f => f !== q)
            : [...favorites, q];
        setFavorites(next);
        saveFavorites(next);
    };

    // ── Clear history ─────────────────────────────────────────────────────────
    const clearHistory = () => {
        setMessages([]);
        localStorage.removeItem(LS_HISTORY);
    };

    // ── Smart suggestions ─────────────────────────────────────────────────────
    const now = new Date();
    const suggestions = getSmartSuggestions(
        now.getHours(),
        now.getDate(),
        (contextSummary?.lowStockCount ?? 0) > 0,
    );

    // All available suggestion chips (favorites first, then smart)
    const allSuggestions = [
        ...favorites.filter(f => !suggestions.includes(f)),
        ...suggestions,
    ].slice(0, 6);

    const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));
    const hasUnread = activeAlerts.length > 0;

    return (
        <>
            {/* ── Floating Action Button ── */}
            <button
                onClick={() => setOpen(true)}
                className={cn(
                    'fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-lg',
                    'bg-gradient-to-br from-yellow-400 to-orange-500 text-white',
                    'flex items-center justify-center hover:scale-105 transition-transform',
                    'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2',
                )}
                title="المساعد الذكي"
            >
                <Bot className="w-6 h-6" />
                {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                        {activeAlerts.length}
                    </span>
                )}
            </button>

            {/* ── Chat Panel ── */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="left"
                    className="w-full sm:w-[480px] p-0 flex flex-col gap-0"
                    dir="rtl"
                >
                    {/* Header */}
                    <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="flex items-center gap-2 text-base">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                المساعد الذكي
                            </SheetTitle>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearHistory}
                                    className="h-8 px-2 text-xs text-muted-foreground"
                                    title="مسح المحادثة"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                        {contextSummary && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                <Badge variant="outline" className="text-[11px] h-5">
                                    اليوم: {contextSummary.todaySales.toLocaleString()}
                                </Badge>
                                <Badge variant="outline" className="text-[11px] h-5">
                                    {contextSummary.ordersToday} طلب
                                </Badge>
                                {contextSummary.topItem && (
                                    <Badge variant="outline" className="text-[11px] h-5">
                                        ⭐ {contextSummary.topItem}
                                    </Badge>
                                )}
                                {contextSummary.aiDailyLimit > 0 && (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-[11px] h-5',
                                            contextSummary.aiRemaining === 0
                                                ? 'border-red-300 text-red-600 bg-red-50'
                                                : contextSummary.aiRemaining !== null && contextSummary.aiRemaining <= 3
                                                    ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                                                    : '',
                                        )}
                                    >
                                        💬 {contextSummary.aiRemaining === 0 ? 'انتهى الحد' : `${contextSummary.aiRemaining} متبقية`}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </SheetHeader>

                    {/* Proactive Alerts */}
                    {activeAlerts.length > 0 && (
                        <div className="flex-shrink-0 px-3 pt-2 space-y-1">
                            {activeAlerts.map(alert => (
                                <div
                                    key={alert.id}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                                        alert.severity === 'warning'
                                            ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300'
                                            : 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
                                    )}
                                >
                                    {alert.icon}
                                    <span className="flex-1">{alert.text}</span>
                                    <button
                                        onClick={() => setDismissedAlerts(prev => { const s = new Set(Array.from(prev)); s.add(alert.id); return s; })}
                                        className="opacity-60 hover:opacity-100"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Not configured warning */}
                    {notConfigured && (
                        <div className="mx-3 mt-2 flex-shrink-0 bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2">
                            مفتاح الذكاء الاصطناعي غير مكوّن. أضف <code className="bg-muted px-1 rounded">AI_PROVIDER</code> و API key في <code className="bg-muted px-1 rounded">.env</code>
                        </div>
                    )}

                    {/* Daily limit exceeded */}
                    {limitExceeded && (
                        <div className="mx-3 mt-2 flex-shrink-0 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                            <Bot className="w-4 h-4 shrink-0" />
                            <span>تم استنفاد الحد اليومي للمساعد الذكي. يتجدد الحد غداً.</span>
                        </div>
                    )}

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                        {messages.length === 0 && !isStreaming && (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center gap-3">
                                <Sparkles className="w-12 h-12 opacity-20 text-yellow-500" />
                                <p className="text-sm font-medium">اسأل عن أي شيء يتعلق بمطعمك</p>
                                <p className="text-xs opacity-70">المبيعات • الأرباح • المخزون • العملاء</p>
                            </div>
                        )}

                        {messages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} />
                        ))}

                        {isStreaming && <StreamingBubble content={streamingContent} />}

                        <div ref={bottomRef} />
                    </div>

                    {/* Suggestions & Favorites */}
                    <div className="flex-shrink-0 px-3 pb-1">
                        <div className="flex flex-wrap gap-1.5">
                            {allSuggestions.map(q => {
                                const isFav = favorites.includes(q);
                                return (
                                    <div key={q} className="flex items-center gap-0.5">
                                        <button
                                            onClick={() => sendMessage(q)}
                                            disabled={isStreaming}
                                            className={cn(
                                                'px-2.5 py-1 rounded-full text-xs border transition-colors',
                                                'bg-background hover:bg-muted disabled:opacity-50',
                                                isFav && 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20',
                                            )}
                                        >
                                            {isFav && '⭐ '}{q}
                                        </button>
                                        <button
                                            onClick={() => toggleFavorite(q)}
                                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground transition-opacity"
                                            title={isFav ? 'إلغاء التثبيت' : 'تثبيت'}
                                        >
                                            {isFav
                                                ? <StarOff className="w-3 h-3 text-yellow-500" />
                                                : <Star className="w-3 h-3" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Input area */}
                    <div className="flex-shrink-0 border-t px-3 py-3 bg-background">
                        {limitExceeded || contextSummary?.aiRemaining === 0 ? (
                            <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                                <Ban className="w-4 h-4 text-red-400" />
                                تم استنفاد الحد اليومي — يتجدد غداً
                            </div>
                        ) : (
                            <div className="flex gap-2 items-end">
                                <Textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="اكتب سؤالك... (Enter للإرسال، Shift+Enter لسطر جديد)"
                                    className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm leading-relaxed"
                                    disabled={isStreaming}
                                    rows={1}
                                    dir="rtl"
                                />
                                <Button
                                    onClick={() => sendMessage(input)}
                                    disabled={isStreaming || !input.trim()}
                                    size="sm"
                                    className="h-11 px-3 flex-shrink-0"
                                >
                                    {isStreaming
                                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                                        : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
