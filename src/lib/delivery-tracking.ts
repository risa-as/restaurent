import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// T134: Generate a tracking token and store its hash
export async function generateTrackingToken(deliveryId: string): Promise<string> {
    // Remove existing token if any
    await prisma.deliveryTrackingToken.deleteMany({ where: { deliveryId } });

    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');

    await prisma.deliveryTrackingToken.create({
        data: { deliveryId, tokenHash: hash }
    });

    return raw;
}

interface DeliveryInfo {
    id: string;
    order: { orderNumber: number };
    customerPhone?: string | null;
    customerName?: string | null;
}

// T135: Send tracking notification (SMS via Twilio or console fallback)
export async function sendTrackingNotification(delivery: DeliveryInfo, rawToken: string): Promise<void> {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const trackingUrl = `https://${rootDomain}/track/${rawToken}`;

    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER && delivery.customerPhone) {
        try {
            const body = encodeURIComponent(
                `طلبك #${delivery.order.orderNumber} قيد التوصيل. تتبع السائق: ${trackingUrl}`
            );
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
            const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

            await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `To=${encodeURIComponent(delivery.customerPhone)}&From=${encodeURIComponent(TWILIO_FROM_NUMBER)}&Body=${body}`,
            });
        } catch (err) {
            console.error('Twilio SMS error:', err);
        }
    } else {
        console.log(`[Delivery Tracking] Order #${delivery.order.orderNumber} tracking URL: ${trackingUrl}`);
    }
}
