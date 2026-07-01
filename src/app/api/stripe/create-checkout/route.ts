import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant';

export async function POST(req: Request) {
    try {
        const tenantContext = await getTenantContext();
        if (!tenantContext) {
            return NextResponse.json({ error: 'غير مصرح لك بإجراء هذه العملية' }, { status: 401 });
        }

        const body = await req.json();
        const { planId, successUrl, cancelUrl } = body;

        if (!planId) {
            return NextResponse.json({ error: 'يجب اختيار خطة اشتراك' }, { status: 400 });
        }

        // Get matching Stripe price ID from env based on planId logic
        const priceId = process.env[`STRIPE_PRICE_${planId}`];
        if (!priceId) {
            return NextResponse.json({ error: 'خطة غير صالحة أو غير متوفرة حالياً' }, { status: 400 });
        }

        // We fetch tenant directly avoiding global context if we want to be safe, but global context should work here.
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantContext.id }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'لم يتم العثور على المطعم' }, { status: 404 });
        }

        let stripeCustomerId = tenant.stripeCustomerId;

        // Create Stripe Customer if it doesn't exist
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: 'admin@' + tenant.slug + '.app', // Ideally fetch from owner user
                name: tenant.name,
                metadata: {
                    tenantId: tenant.id,
                }
            });
            stripeCustomerId = customer.id;

            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { stripeCustomerId }
            });
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                tenantId: tenant.id,
                planId: planId,
            },
            subscription_data: {
                metadata: {
                    tenantId: tenant.id,
                }
            }
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: 'حدث خطأ أثناء إعداد عملية الدفع' }, { status: 500 });
    }
}
