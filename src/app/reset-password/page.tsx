import { ResetPasswordForm } from '@/components/auth/reset-password-form';

interface ResetPasswordPageProps {
    searchParams: { token?: string };
}

export const metadata = {
    title: 'إعادة تعيين كلمة المرور',
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir="rtl">
            <div className="w-full max-w-md">
                <ResetPasswordForm token={searchParams.token ?? ''} />
            </div>
        </div>
    );
}
