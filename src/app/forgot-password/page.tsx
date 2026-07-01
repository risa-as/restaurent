import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata = {
    title: 'نسيت كلمة المرور',
};

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir="rtl">
            <div className="w-full max-w-md">
                <ForgotPasswordForm />
            </div>
        </div>
    );
}
