import { getReadyOrders } from '@/lib/actions/waiter';
import { WaiterDashboard } from '@/components/waiter/waiter-dashboard';
import { Utensils } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WaiterPage() {
    const orders = await getReadyOrders();

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-green-100">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg text-green-700">
                        <Utensils className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">طلبات الصالة الجاهزة</h1>
                        <p className="text-sm text-gray-500">قم بتوصيل الطلبات للطاولات ثم اضغط &quot;تم التقديم&quot;</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full font-bold shadow-sm">
                        {orders.length}
                    </span>
                    <span className="text-sm font-medium text-gray-600">طلب جاهز</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
                <WaiterDashboard orders={orders} />
            </div>
        </div>
    );
}
