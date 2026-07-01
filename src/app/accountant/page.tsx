import { redirect } from 'next/navigation';

export const metadata = {
    title: 'المحاسب',
};

export default function AccountantPage() {
    redirect('/accountant/reports');
}
