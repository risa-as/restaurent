'use client';

import { useMemo } from 'react';

/**
 * Reads the 5 brand chart CSS variables (--chart-1 through --chart-5)
 * and converts them from HSL to hex strings for use in Recharts.
 *
 * Falls back to the Night Market brand palette if CSS vars are unavailable (SSR).
 *
 * Night Market palette:
 *  chart-1: Electric Indigo  #4F46E5
 *  chart-2: Success Green    #22C55E
 *  chart-3: Info Cyan        #0EA5E9
 *  chart-4: Saffron Gold     #F59E0B
 *  chart-5: Purple           #A855F7
 */
function hslVarToHex(varName: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
    if (!value) return fallback;
    // Shadcn format: "H S% L%" — e.g. "246 80% 58%"
    const parts = value.split(' ');
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    const l = parseFloat(parts[2]);
    if (isNaN(h) || isNaN(s) || isNaN(l)) return fallback;
    return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export interface ChartColors {
    primary: string;       // --primary (system brand color)
    chart1: string;        // --chart-1 (Electric Indigo)
    success: string;       // --chart-2 (Green)
    info: string;          // --chart-3 (Cyan)
    warning: string;       // --chart-4 (Saffron Gold)
    purple: string;        // --chart-5 (Purple)
    muted: string;         // --muted-foreground (axis labels)
    border: string;        // --border (grid lines)
    all: string[];         // all 5 in order
    tooltip: {
        bg: string;
        border: string;
        text: string;
    };
}

const SSR_FALLBACKS = {
    primary: '#f97316',  // Default orange (system primary)
    chart1: '#4F46E5',  // Electric Indigo
    chart2: '#22C55E',  // Success Green
    chart3: '#0EA5E9',  // Info Cyan
    chart4: '#F59E0B',  // Saffron Gold
    chart5: '#A855F7',  // Purple
    muted: '#6B7280',
    border: '#E5E7EB',
};

export function useChartColors(): ChartColors {
    return useMemo(() => {
        const primary = hslVarToHex('--primary', SSR_FALLBACKS.primary);
        const c1 = hslVarToHex('--chart-1', SSR_FALLBACKS.chart1);
        const c2 = hslVarToHex('--chart-2', SSR_FALLBACKS.chart2);
        const c3 = hslVarToHex('--chart-3', SSR_FALLBACKS.chart3);
        const c4 = hslVarToHex('--chart-4', SSR_FALLBACKS.chart4);
        const c5 = hslVarToHex('--chart-5', SSR_FALLBACKS.chart5);
        const muted = hslVarToHex('--muted-foreground', SSR_FALLBACKS.muted);
        const border = hslVarToHex('--border', SSR_FALLBACKS.border);
        return {
            primary,
            chart1: c1,
            success: c2,
            info: c3,
            warning: c4,
            purple: c5,
            muted,
            border,
            all: [primary, c2, c3, c4, c5],
            tooltip: {
                bg: 'hsl(var(--card))',
                border: border,
                text: 'hsl(var(--foreground))',
            },
        };
    }, []);
}
