'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function BillingActions({
    hasSubscription,
    currentPlan,
    isPastDue
}: {
    hasSubscription: boolean,
    currentPlan: string,
    isPastDue: boolean
}) {
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async (planId: string) => {
        try {
            setLoading(true);
            const res = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    successUrl: window.location.href + '?success=true',
                    cancelUrl: window.location.href + '?canceled=true',
                })
            });
            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleManage = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/stripe/create-portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    returnUrl: window.location.href,
                })
            });
            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (hasSubscription) {
        return (
            <Button onClick={handleManage} disabled={loading} className={`${isPastDue ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}>
                {loading ? 'الرجاء الانتظار...' : (isPastDue ? 'تحديث بطاقة الدفع' : 'إدارة الفواتير والبطاقات')}
            </Button>
        );
    }

    return (
        <Button
            onClick={() => handleSubscribe(currentPlan === 'BASIC' ? 'PRO' : currentPlan)}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
        >
            {loading ? 'جاري التحويل...' : 'ترقية الاشتراك الآن'}
        </Button>
    );
}
