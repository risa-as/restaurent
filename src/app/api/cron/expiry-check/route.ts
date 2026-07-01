import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerPusher } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    const secret = process.env.CRON_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Get all active tenants (isActive covers TRIAL tenants too — not just paid)
        const tenants = await prisma.tenant.findMany({
            where: { isActive: true },
            select: { id: true }
        });

        let alertCount = 0;

        for (const tenant of tenants) {
            // Get all branches for this tenant
            const branches = await prisma.branch.findMany({
                where: { tenantId: tenant.id, isActive: true },
                select: { id: true }
            });

            // Check expiring batches per branch
            const branchIds = branches.length > 0 ? branches.map(b => b.id) : [null as unknown as string];

            for (const branchId of branchIds) {
                const expiring = await prisma.inventoryBatch.findMany({
                    where: {
                        tenantId: tenant.id,
                        ...(branchId ? { branchId } : { branchId: null }),
                        expiryDate: { lte: in7Days },
                        remainingQty: { gt: 0 },
                    },
                    include: { material: { select: { name: true } } }
                });

                if (expiring.length > 0) {
                    alertCount += expiring.length;
                    const channelId = branchId || tenant.id;
                    await triggerPusher(
                        `tenant-${tenant.id}-inventory-${channelId}`,
                        'expiry-alert',
                        {
                            batches: expiring.map(b => ({
                                id: b.id,
                                materialName: b.material.name,
                                remainingQty: b.remainingQty,
                                expiryDate: b.expiryDate,
                                daysLeft: b.expiryDate
                                    ? Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                    : null,
                            }))
                        }
                    );
                }
            }
        }

        return NextResponse.json({ success: true, alertCount });
    } catch (error) {
        console.error('Expiry check cron error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
