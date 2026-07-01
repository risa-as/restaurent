import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'طلب الطعام',
    description: 'اطلب طعامك مباشرة من طاولتك',
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
