import { prisma } from '@/lib/prisma';
import { DEFAULT_NUMBER_LOCALE } from '@/lib/number-locale';

/** Fetch the current number locale from DB. For use in server components only. */
export async function getNumberLocale(): Promise<string> {
    try {
        const settings = await prisma.systemSetting.findFirst({
            select: { numberLocale: true },
        });
        return settings?.numberLocale || DEFAULT_NUMBER_LOCALE;
    } catch {
        return DEFAULT_NUMBER_LOCALE;
    }
}
