import crypto from 'crypto';

interface TalabatConfig {
    storeId: string;
    apiKey: string;
    webhookSecret: string;
    isEnabled: boolean;
}

interface TalabatMenuItem {
    id: string;
    name: string;
    nameAr?: string;
    price: number;
    isAvailable: boolean;
    categoryId: string;
}

/**
 * T152: Talabat API client
 */
export class TalabatClient {
    private readonly config: TalabatConfig;
    private readonly baseUrl = 'https://api.talabat.com/v1';

    constructor(config: TalabatConfig) {
        this.config = config;
    }

    /** HMAC-SHA256 signature verification (timing-safe) */
    verifySignature(rawBody: string, signature: string): boolean {
        try {
            const expected = crypto
                .createHmac('sha256', this.config.webhookSecret)
                .update(rawBody)
                .digest('hex');
            const expectedBuf = Buffer.from(expected);
            const actualBuf = Buffer.from(signature.replace(/^sha256=/, ''));
            if (expectedBuf.length !== actualBuf.length) return false;
            return crypto.timingSafeEqual(expectedBuf, actualBuf);
        } catch {
            return false;
        }
    }

    /** Update order status on Talabat */
    async updateOrderStatus(
        talabatOrderId: string,
        status: string,
        eta?: number
    ): Promise<void> {
        const statusMap: Record<string, string> = {
            PREPARING: 'ACCEPTED',
            READY: 'READY_FOR_PICKUP',
            COMPLETED: 'DELIVERED',
            CANCELLED: 'REJECTED',
        };
        const talabatStatus = statusMap[status] ?? status;

        const res = await fetch(`${this.baseUrl}/orders/${talabatOrderId}/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                'X-Store-ID': this.config.storeId,
            },
            body: JSON.stringify({ status: talabatStatus, ...(eta ? { eta } : {}) }),
        });

        if (!res.ok) {
            console.error(`Talabat status update failed: ${res.status} ${await res.text()}`);
        }
    }

    /** Sync menu to Talabat */
    async syncMenu(
        categories: { id: string; name: string; nameAr?: string; items: TalabatMenuItem[] }[]
    ): Promise<void> {
        const payload = {
            categories: categories.map(cat => ({
                externalId: cat.id,
                name: cat.nameAr || cat.name,
                items: cat.items.map(item => ({
                    externalId: item.id,
                    name: item.nameAr || item.name,
                    price: item.price,
                    available: item.isAvailable,
                })),
            })),
        };

        const res = await fetch(`${this.baseUrl}/stores/${this.config.storeId}/menu`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            console.error(`Talabat menu sync failed: ${res.status} ${await res.text()}`);
        }
    }
}
