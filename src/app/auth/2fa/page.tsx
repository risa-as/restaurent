import { Suspense } from 'react';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { TwoFactorVerify } from '@/components/auth/two-factor-verify';
import { auth } from '@/lib/auth';

interface Props {
    searchParams: Promise<{ setup?: string }>;
}

export const metadata = {
    title: 'التحقق بخطوتين',
};

export default async function TwoFactorPage({ searchParams }: Props) {
    const params = await searchParams;
    const isSetup = params.setup === 'true';
    const session = await auth();
    const role = session?.user?.role as string | undefined;

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Suspense>
                {isSetup ? <TwoFactorSetup role={role} /> : <TwoFactorVerify role={role} />}
            </Suspense>
        </div>
    );
}
