import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { resend, getEmailFrom } from '@/lib/resend';
import WelcomeEmail from '@/emails/welcome';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tenant, owner } = body;

        // 1. Validate inputs
        if (!tenant?.name || !tenant?.slug || !owner?.name || !owner?.email || !owner?.password) {
            return NextResponse.json({ error: 'من فضلك أكمل جميع الحقول المطلوبة' }, { status: 400 });
        }

        // Validate slug letters only
        if (!/^[a-z0-9-]+$/.test(tenant.slug)) {
            return NextResponse.json({ error: 'الرابط يجب أن يحتوي على حروف إنجليزية وأرقام وعلامة (-) فقط' }, { status: 400 });
        }

        // 2. Check Uniqueness
        const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenant.slug } });
        if (existingTenant) {
            return NextResponse.json({ error: 'هذا الرابط (subdomain) مستخدم من قبل، اختر اسماً آخر' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: owner.email } });
        if (existingUser) {
            // Technically email could cross tenants? No, email is unique globally in the current schema
            return NextResponse.json({ error: 'البريد الإلكتروني مسجل مسبقاً' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(owner.password, 10);

        // 3. Create Tenant and initial Admin User in a transaction
        // We use basePrisma client if we were in another context, but we can just use normal prisma
        // Wait, prisma extensions inject tenantId if context exists. In APIs, context might not exist, but let's be explicit
        const result = await prisma.$transaction(async (tx) => {
            const newTenant = await tx.tenant.create({
                data: {
                    name: tenant.name,
                    slug: tenant.slug,
                    primaryColor: tenant.primaryColor,
                    plan: 'TRIAL',
                    subscriptionStatus: 'TRIAL', // All new accounts start on Trial
                    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                    isActive: true,
                    // Always provision a main branch so every record carries a real
                    // branchId from day one (no NULL-branch data; multi-branch upgrade
                    // later needs no migration).
                    branches: {
                        create: {
                            name: tenant.name,
                            isMainBranch: true,
                            isActive: true,
                        },
                    },
                }
            });

            const newUser = await tx.user.create({
                data: {
                    name: owner.name,
                    email: owner.email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    tenantId: newTenant.id,
                }
            });

            // Initial config
            // Optionally set up default categories, roles, etc.

            return { tenant: newTenant, user: newUser };
        });

        // 4. Send Welcome Email asynchronously 
        // Best effort, don't block registration if email fails
        if (resend) {
            try {
                const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
                const dashboardUrl = `https://${result.tenant.slug}.${domain}/login`;

                await resend.emails.send({
                    from: `ادارة المطاعم <${getEmailFrom()}>`,
                    to: result.user.email,
                    subject: 'مرحباً بك في منصة إدارة المطاعم',
                    react: WelcomeEmail({
                        ownerName: result.user.name,
                        restaurantName: result.tenant.name,
                        dashboardUrl
                    }) as any
                });
            } catch (emailErr) {
                console.error('Failed to send welcome email:', emailErr);
            }
        }

        return NextResponse.json({ success: true, slug: result.tenant.slug });

    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'حدث خطأ داخلي أثناء التسجيل' }, { status: 500 });
    }
}
