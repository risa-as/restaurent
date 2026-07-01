'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';

export function AIInsightsCard() {
    const [insights, setInsights] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [notConfigured, setNotConfigured] = useState<boolean>(false);
    const { toast } = useToast();

    const fetchInsights = async () => {
        setIsLoading(true);
        setInsights('');
        setError(null);
        setNotConfigured(false);

        try {
            const response = await fetch('/api/analytics/insights');

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (errData.code === 'OPENAI_NOT_CONFIGURED') {
                    setNotConfigured(true);
                    return;
                }
                throw new Error(errData.error || 'فشل في جلب التحليلات');
            }

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;
            let fullText = '';

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) {
                    const chunkValue = decoder.decode(value, { stream: true });
                    fullText += chunkValue;
                    setInsights(fullText);
                }
            }
        } catch (err: any) {
            console.error('Streaming error:', err);
            setError(err.message);
            toast({
                title: "خطأ في الذكاء الاصطناعي",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Auto fetch on first load
        fetchInsights();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Card className="border-[var(--primary)] shadow-sm bg-gradient-to-br from-white to-primary/5 dark:from-slate-900 dark:to-primary/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-[var(--primary)] text-xl">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    مستشار الذكاء الاصطناعي
                </CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchInsights}
                    disabled={isLoading}
                    className="gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    تحديث
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading && !insights && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground animate-pulse">
                        <Sparkles className="w-8 h-8 mb-2 opacity-50 text-yellow-500" />
                        <p>يتم تحليل بيانات المطعم واستخلاص التوصيات...</p>
                    </div>
                )}

                {notConfigured && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center gap-2">
                        <Settings className="w-8 h-8 mb-1 opacity-50" />
                        <p className="font-medium">ميزة الذكاء الاصطناعي غير مفعّلة</p>
                        <p className="text-sm">لتفعيل مستشار الذكاء الاصطناعي، أضف <code className="bg-muted px-1 rounded text-xs">OPENAI_API_KEY</code> في إعدادات البيئة.</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-8 text-destructive">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <p>{error}</p>
                    </div>
                )}

                {insights && (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-[var(--primary)] prose-a:text-[var(--primary)]" dir="rtl">
                        <ReactMarkdown>{insights}</ReactMarkdown>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
