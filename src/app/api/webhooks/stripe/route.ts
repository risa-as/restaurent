import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { resend, getEmailFrom } from '@/lib/resend';
import PaymentFailedEmail from '@/emails/payment-failed';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    try {
        if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error('Missing stripe signature or webhook secret');
        }
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const tenantId = session.metadata?.tenantId;
                const planId = session.metadata?.planId;

                if (tenantId) {
                    await prisma.tenant.update({
                        where: { id: tenantId },
                        data: {
                            subscriptionStatus: 'ACTIVE',
                            plan: planId as any || 'PRO',
                            stripeSubscriptionId: session.subscription as string,
                            isActive: true, // ensure it's un-suspended
                        }
                    });
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const subscriptionId = (invoice as any).subscription as string;

                if (subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

                    await prisma.tenant.update({
                        where: { stripeSubscriptionId: subscriptionId },
                        data: {
                            subscriptionStatus: 'ACTIVE',
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            currentPeriodEnd: new Date(((subscription as any).current_period_end as number) * 1000),
                            isActive: true
                        }
                    });
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                const tenant = await prisma.tenant.findUnique({
                    where: { stripeCustomerId: customerId },
                    include: { users: { where: { role: 'ADMIN' }, take: 1 } }
                });

                if (tenant) {
                    await prisma.tenant.update({
                        where: { id: tenant.id },
                        data: {
                            subscriptionStatus: 'PAST_DUE'
                        }
                    });

                    // Send email alert to admin
                    const adminEmail = tenant.users[0]?.email;
                    if (adminEmail && resend) {
                        try {
                            const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
                            await resend.emails.send({
                                from: `الفوترة <${getEmailFrom()}>`,
                                to: adminEmail,
                                subject: 'عاجل: فشل دفع اشتراك المطعم',
                                react: PaymentFailedEmail({
                                    restaurantName: tenant.name,
                                    dashboardUrl: `https://${tenant.slug}.${domain}/dashboard/billing`
                                }) as any
                            });
                        } catch {
                            console.error('Failed to send payment failed email');
                        }
                    }
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                await prisma.tenant.update({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        subscriptionStatus: 'CANCELED',
                        isActive: false // Lock them out if cancelled completely
                    }
                });
                break;
            }
        }

        return new NextResponse(null, { status: 200 });
    } catch (error) {
        console.error('Webhook Handle Error:', error);
        return new NextResponse('Internal Webhook Error', { status: 500 });
    }
}
