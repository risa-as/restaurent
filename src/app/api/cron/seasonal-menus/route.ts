import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Activate menus whose startDate has arrived and endDate is in the future
    const toActivate = await prisma.seasonalMenu.updateMany({
        where: { isActive: false, startDate: { lte: now }, endDate: { gte: now } },
        data: { isActive: true },
    });

    // Deactivate menus whose endDate has passed
    const toDeactivate = await prisma.seasonalMenu.updateMany({
        where: { isActive: true, endDate: { lt: now } },
        data: { isActive: false },
    });

    return NextResponse.json({
        activated: toActivate.count,
        deactivated: toDeactivate.count,
    });
}
