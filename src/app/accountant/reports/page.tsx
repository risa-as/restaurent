import { redirect } from 'next/navigation';

export const metadata = {
    title: 'التقارير المالية',
};

export default function AccountantReportsRedirect() {
    redirect('/dashboard/accountant/reports');
}
