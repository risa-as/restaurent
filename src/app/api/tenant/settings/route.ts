import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant';
import { getActiveBranchId } from '@/lib/utils/branch-filter';
import { getEffectiveLimits } from '@/lib/plan-limits';

export async function GET() {
    try {
        const tenantContext = await getTenantContext();
        if (!tenantContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantContext.id }
        });

        const branchId = await getActiveBranchId(tenantContext.id);
        if (branchId) {
            const branch = await prisma.branch.findUnique({
                where: { id: branchId },
                select: { name: true, primaryColor: true, logoUrl: true, appName: true }
            });
            if (branch) {
                return NextResponse.json({
                    tenant: {
                        ...tenant,
                        name: branch.name || tenant?.name,
                        primaryColor: branch.primaryColor ?? tenant?.primaryColor,
                        logoUrl: branch.logoUrl !== undefined ? branch.logoUrl : tenant?.logoUrl,
                        appName: branch.appName ?? tenant?.appName,
                        _branchId: branchId,
                    }
                });
            }
        }

        return NextResponse.json({ tenant });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const tenantContext = await getTenantContext();
        if (!tenantContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { primaryColor, logoUrl, name, appName } = body;

        const tenantRecord = await prisma.tenant.findUnique({
            where: { id: tenantContext.id },
            select: { plan: true, featureOverrides: true },
        });
        const limits = getEffectiveLimits(tenantRecord ?? { plan: 'TRIAL' });

        if ((logoUrl !== undefined || appName !== undefined || primaryColor) && !limits.modules.customBranding) {
            return NextResponse.json(
                { error: 'الهوية التجارية (الشعار واسم التطبيق والألوان) متاحة في خطة المؤسسات (ENTERPRISE) فقط' },
                { status: 403 }
            );
        }

        const branchId = await getActiveBranchId(tenantContext.id);
        if (branchId) {
            const updated = await prisma.branch.update({
                where: { id: branchId },
                data: {
                    ...(name && { name }),
                    ...(primaryColor !== undefined && { primaryColor }),
                    ...(logoUrl !== undefined && { logoUrl }),
                    ...(appName !== undefined && { appName }),
                }
            });
            return NextResponse.json({ success: true, tenant: { ...updated, _branchId: branchId } });
        }

        const updated = await prisma.tenant.update({
            where: { id: tenantContext.id },
            data: {
                ...(primaryColor && { primaryColor }),
                ...(logoUrl !== undefined && { logoUrl }),
                ...(name && { name }),
                ...(appName !== undefined && { appName }),
            }
        });

        return NextResponse.json({ success: true, tenant: updated });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
