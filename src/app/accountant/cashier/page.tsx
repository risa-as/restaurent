import { redirect } from 'next/navigation';

export const metadata = {
    title: 'تسوية الكاشير',
};

export default function AccountantCashierRedirect() {
    redirect('/dashboard/accountant/cashier');
}
