import { getUsers, getSystemSettings } from '@/lib/actions/admin';
import { UserManagement } from '@/components/admin/user-management';
import { SettingsForm } from '@/components/admin/settings-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function AdminPage({
    searchParams,
}: {
    searchParams: { tab?: string };
}) {
    const users = await getUsers();
    const settings = await getSystemSettings();
    const defaultTab = searchParams.tab === 'settings' ? 'settings' : 'users';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">إدارة النظام</h1>

            <Tabs defaultValue={defaultTab}>
                <TabsList>
                    <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
                    <TabsTrigger value="settings">إعدادات النظام</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="mt-4">
                    <UserManagement users={users} />
                </TabsContent>
                <TabsContent value="settings" className="mt-4">
                    <SettingsForm settings={settings} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
