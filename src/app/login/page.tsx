import LoginForm from '@/components/auth/login-form';
import { Metadata } from 'next';
import { Star } from 'lucide-react';

export const metadata: Metadata = {
    title: 'تسجيل الدخول',
};

const features = [
    { icon: '🍽️', text: 'إدارة الطلبات لحظةً بلحظة' },
    { icon: '📊', text: 'تقارير مالية شاملة في ثوانٍ' },
    { icon: '👨‍🍳', text: 'شاشة مطبخ ذكية للطهاة' },
    { icon: '🚀', text: 'نظام POS سريع للكاشير' },
];

export default function LoginPage() {
    return (
        <main className="min-h-screen flex" dir="rtl">

            {/* ── RIGHT PANEL: Hero (shown on md+) ── */}
            <div className="hidden md:flex md:w-[55%] relative overflow-hidden bg-[hsl(246,80%,14%)] flex-col justify-between p-12">

                {/* Animated gradient orbs */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/30 blur-3xl animate-pulse" />
                    <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-accent/20 blur-3xl animate-pulse [animation-delay:2s]" />
                    <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full bg-purple-900/40 blur-3xl animate-pulse [animation-delay:1s]" />
                </div>

                {/* Subtle dot grid overlay */}
                <div
                    className="absolute inset-0 z-0 opacity-[0.06]"
                    style={{
                        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
                        backgroundSize: '28px 28px',
                    }}
                />

                {/* Top brand */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 shadow-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="نظام المطعم" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <p className="text-white font-black text-lg leading-none">نظام المطعم</p>
                        <p className="text-white/50 text-xs">Restaurant OS</p>
                    </div>
                </div>

                {/* Center hero text */}
                <div className="relative z-10 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 text-accent px-3 py-1.5 rounded-full text-sm font-bold">
                        <Star className="w-3.5 h-3.5 fill-accent" />
                        النظام الأول في إدارة المطاعم
                    </div>
                    <h1 className="text-5xl font-black text-white leading-tight">
                        أدِر مطعمك
                        <br />
                        <span className="text-accent">بكفاءة استثنائية</span>
                    </h1>
                    <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                        منصة متكاملة تجمع بين سرعة الكاشير، وذكاء المطبخ، ودقة التقارير — في واجهة واحدة أنيقة.
                    </p>

                    {/* Feature pills */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm"
                            >
                                <span className="text-xl">{f.icon}</span>
                                <span className="text-white/80 text-sm font-medium leading-tight">{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom version note */}
                <div className="relative z-10 text-white/30 text-xs">
                    v5.0 · Phase 5 UI · Night Market Edition
                </div>
            </div>

            {/* ── LEFT PANEL: Login Form ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background min-h-screen">

                {/* Mobile brand — only visible on small screens */}
                <div className="md:hidden mb-8 flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(246,80%,14%)] shadow-lg shadow-primary/25 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="نظام المطعم" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-black text-foreground">نظام المطعم</h1>
                </div>

                {/* Form area */}
                <div className="w-full max-w-sm space-y-2">
                    <LoginForm />
                </div>

                {/* Footer */}
                <p className="mt-8 text-xs text-muted-foreground text-center">
                    جميع الحقوق محفوظة &copy; {new Date().getFullYear()} — نظام إدارة المطاعم
                </p>
            </div>
        </main>
    );
}
