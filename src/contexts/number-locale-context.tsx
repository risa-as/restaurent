'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_NUMBER_LOCALE, formatNum, formatDate, formatDateTime } from '@/lib/number-locale';

const NumberLocaleContext = createContext<string>(DEFAULT_NUMBER_LOCALE);

export function NumberLocaleProvider({
    locale,
    children,
}: {
    locale: string;
    children: React.ReactNode;
}) {
    return (
        <NumberLocaleContext.Provider value={locale}>
            {children}
        </NumberLocaleContext.Provider>
    );
}

export function useNumberLocale(): string {
    return useContext(NumberLocaleContext);
}

/** Returns a locale-aware number formatter. Use inside client components. */
export function useFmt() {
    const locale = useNumberLocale();
    return (n: number, opts?: Intl.NumberFormatOptions) => formatNum(n, locale, opts);
}

/** Returns a locale-aware date formatter. Use inside client components. */
export function useDateFmt() {
    const locale = useNumberLocale();
    return (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => formatDate(d, locale, opts);
}

/** Returns a locale-aware date+time formatter. Use inside client components. */
export function useDateTimeFmt() {
    const locale = useNumberLocale();
    return (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => formatDateTime(d, locale, opts);
}
