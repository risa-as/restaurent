import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'الهوية البصرية',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
