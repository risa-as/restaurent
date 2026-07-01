import { getAnnouncements } from '@/lib/actions/superadmin';
import AnnouncementForm from '@/components/superadmin/announcement-form';
import AnnouncementsList from '@/components/superadmin/announcements-list';
import { Megaphone } from 'lucide-react';

export const metadata = {
    title: 'الإعلانات',
};

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
    const announcements = await getAnnouncements();

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Megaphone className="w-7 h-7" />
                    الإعلانات
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">أرسل إعلانات تظهر في لوحات تحكم المطاعم</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 items-start">
                <AnnouncementForm />
                <div className="space-y-3">
                    <h2 className="font-bold">الإعلانات المنشورة ({announcements.length})</h2>
                    <AnnouncementsList announcements={announcements} />
                </div>
            </div>
        </div>
    );
}
