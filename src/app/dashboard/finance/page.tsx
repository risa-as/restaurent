import { redirect } from 'next/navigation';

export const metadata = {
    title: 'المالية',
};

export default function FinanceRedirect() {
    redirect('/dashboard/accountant/finance');
}
