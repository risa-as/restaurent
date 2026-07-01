import { redirect } from 'next/navigation';

export const metadata = {
    title: 'إدارة الفريق',
};

export default function TeamSettingsRedirect() {
    redirect('/dashboard/admin');
}
