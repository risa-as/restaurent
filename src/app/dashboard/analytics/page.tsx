import { redirect } from 'next/navigation';

export const metadata = {
    title: 'التحليلات',
};

export default function AnalyticsRedirect() {
    redirect('/dashboard/accountant/analytics');
}
