import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant';

export async function POST(req: Request) {
    try {
        const tenantContext = await getTenantContext();
        if (!tenantContext) {
            return NextResponse.json({ error: 'غير مصرح لك' }, { status: 401 });
        }

        const body = await req.json();
        const { returnUrl } = body;

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantContext.id }
        });

        if (!tenant || !tenant.stripeCustomerId) {
            return NextResponse.json({ error: 'لم يتم العثور على بيانات الفوترة مسجلة' }, { status: 400 });
        }

        // Create Billing Portal Session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: tenant.stripeCustomerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: portalSession.url });

    } catch (error: any) {
        console.error('Stripe Portal Error:', error);
        return NextResponse.json({ error: 'حدث خطأ أثناء فتح بوابة إدارة الفوترة' }, { status: 500 });
    }
}
