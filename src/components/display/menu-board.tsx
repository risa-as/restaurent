'use client';

import { useState, useEffect } from 'react';
import { getPusherClient } from '@/lib/pusher';
import Image from 'next/image';
import { useFmt } from '@/contexts/number-locale-context';

interface MenuItem {
    id: string;
    name: string;
    nameAr: string | null;
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
}

interface Category {
    id: string;
    name: string;
    nameAr: string | null;
    items: MenuItem[];
}

interface MenuBoardProps {
    tenantId: string;
    tenantName: string;
    categories: Category[];
    theme: 'dark' | 'light';
    isKiosk: boolean;
    nightMenuStartTime?: string; // "HH:MM" 24h Baghdad time
    nightMenuEndTime?: string;   // "HH:MM" 24h Baghdad time
}

function getCurrentBaghdadHour(): number {
    return new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Baghdad' })
    ).getHours();
}

function isNightTime(hour: number, startTime?: string, endTime?: string): boolean {
    if (!startTime || !endTime) return false;
    const start = parseInt(startTime.split(':')[0], 10);
    const end = parseInt(endTime.split(':')[0], 10);
    // Handles overnight ranges (e.g. 22:00 – 06:00)
    if (start <= end) return hour >= start && hour < end;
    return hour >= start || hour < end;
}

export function MenuBoard({ tenantId, tenantName, categories: initialCategories, theme, isKiosk: _isKiosk, nightMenuStartTime, nightMenuEndTime }: MenuBoardProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
    const fmt = useFmt();
    const [categories, setCategories] = useState(initialCategories);
    const [activeCategory, setActiveCategory] = useState(initialCategories[0]?.id ?? '');
    const [hour, setHour] = useState(getCurrentBaghdadHour());

    const isDark = theme === 'dark';

    // Subscribe to Pusher menu-updated events
    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;

        const channel = pusher.subscribe(`menu-${tenantId}`);
        channel.bind('menu-updated', async () => {
            // Re-fetch menu data from API
            try {
                const res = await fetch(`/api/menu/${tenantId}/public`);
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data.categories);
                }
            } catch {
                // non-fatal: next refresh will catch it
            }
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`menu-${tenantId}`);
        };
    }, [tenantId]);

    // Check hour every 60 seconds for night menu
    useEffect(() => {
        const interval = setInterval(() => setHour(getCurrentBaghdadHour()), 60_000);
        return () => clearInterval(interval);
    }, []);

    const isNight = isNightTime(hour, nightMenuStartTime, nightMenuEndTime);

    const activeItems = categories
        .find(c => c.id === activeCategory)
        ?.items.filter(i => i.isAvailable) ?? [];

    return (
        <div
            className={`min-h-screen flex flex-col select-none ${isDark ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}
            dir="rtl"
        >
            {/* Header */}
            <div className={`p-6 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                <h1 className="text-3xl font-black tracking-tight">{tenantName}</h1>
                {isNight && (
                    <p className="text-xs mt-1 opacity-60">🌙 القائمة الليلية</p>
                )}
            </div>

            {/* Category tabs */}
            <div className={`flex gap-2 overflow-x-auto px-4 py-3 border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                {categories.map(cat => {
                    const active = cat.id === activeCategory;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                                active
                                    ? 'bg-primary text-primary-foreground'
                                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {cat.nameAr || cat.name}
                        </button>
                    );
                })}
            </div>

            {/* Items grid */}
            <div className="flex-1 p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {activeItems.map(item => (
                    <div
                        key={item.id}
                        className={`rounded-2xl overflow-hidden border ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white shadow-sm'}`}
                    >
                        {item.imageUrl ? (
                            <div className="relative aspect-square">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.nameAr || item.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                />
                            </div>
                        ) : (
                            <div className={`aspect-square flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                <span className={`text-4xl font-black ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
                                    {(item.nameAr || item.name)[0]}
                                </span>
                            </div>
                        )}
                        <div className="p-3">
                            <p className="font-bold text-sm leading-tight mb-1 line-clamp-2">
                                {item.nameAr || item.name}
                            </p>
                            <p className="font-mono font-black text-primary text-lg">
                                {fmt(item.price)}
                                <span className="text-xs font-normal mr-1 opacity-60">د.ع</span>
                            </p>
                        </div>
                    </div>
                ))}
                {activeItems.length === 0 && (
                    <div className="col-span-full text-center py-16 opacity-40">
                        لا توجد أصناف متاحة
                    </div>
                )}
            </div>
        </div>
    );
}
