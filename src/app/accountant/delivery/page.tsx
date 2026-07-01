import { redirect } from 'next/navigation';

export const metadata = {
    title: 'تسوية التوصيل',
};

export default function AccountantDeliveryRedirect() {
    redirect('/dashboard/accountant/delivery');
}
