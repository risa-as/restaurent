'use client';

import { useState } from 'react';

interface FeedbackPromptProps {
    orderId: string;
    onSubmitted?: () => void;
}

export function FeedbackPrompt({ orderId, onSubmitted }: FeedbackPromptProps) {
    const [selected, setSelected] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, rating: selected, comment }),
            });
            if (res.ok) {
                const data = await res.json();
                setSubmitted(true);
                setGooglePlaceId(data.googlePlaceId ?? null);
                onSubmitted?.();
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5 text-center space-y-3">
                <div className="text-4xl">🙏</div>
                <p className="font-black text-green-700 text-lg">شكراً على تقييمك!</p>
                {googlePlaceId && (
                    <a
                        href={`https://search.google.com/local/writereview?placeid=${googlePlaceId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm text-center"
                    >
                        ⭐ شارك تقييمك على Google
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-2xl p-5 space-y-4">
            <h3 className="font-black text-center text-base">كيف كانت تجربتك؟</h3>

            {/* Star rating */}
            <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        onClick={() => setSelected(star)}
                        className="text-3xl transition-transform active:scale-90"
                    >
                        {star <= selected ? '⭐' : '☆'}
                    </button>
                ))}
            </div>

            {/* Optional comment */}
            {selected > 0 && (
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="تعليق إضافي (اختياري)..."
                    className="w-full rounded-xl border p-3 text-sm resize-none h-20 bg-background"
                />
            )}

            <button
                onClick={handleSubmit}
                disabled={!selected || loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40"
            >
                {loading ? '⏳ جاري الإرسال...' : 'إرسال التقييم'}
            </button>
        </div>
    );
}
