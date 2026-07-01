export const NUMBER_LOCALE_OPTIONS = [
    { value: 'ar-IQ', label: 'أرقام عربية', example: '١٢٬٣٤٥' },
    { value: 'en-US', label: 'أرقام إنجليزية', example: '12,345' },
] as const;

export type NumberLocale = typeof NUMBER_LOCALE_OPTIONS[number]['value'];

export const DEFAULT_NUMBER_LOCALE: NumberLocale = 'ar-IQ';

/** Format a number using the given locale. Safe to use in both server and client. */
export function formatNum(
    n: number,
    locale: string = DEFAULT_NUMBER_LOCALE,
    opts?: Intl.NumberFormatOptions
): string {
    return n.toLocaleString(locale, opts);
}

/** Format a date using the given locale. Safe to use in both server and client. */
export function formatDate(
    d: Date | string | number,
    locale: string = DEFAULT_NUMBER_LOCALE,
    opts?: Intl.DateTimeFormatOptions
): string {
    return new Date(d).toLocaleDateString(locale, opts);
}

/** Format a date+time using the given locale. Safe to use in both server and client. */
export function formatDateTime(
    d: Date | string | number,
    locale: string = DEFAULT_NUMBER_LOCALE,
    opts?: Intl.DateTimeFormatOptions
): string {
    return new Date(d).toLocaleString(locale, opts);
}
