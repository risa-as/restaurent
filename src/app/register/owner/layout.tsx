import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'بيانات المالك',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
