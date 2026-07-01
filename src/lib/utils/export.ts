'use client';

/**
 * Export utility — client-side Excel export using xlsx.
 * Usage: import { exportToExcel } from '@/lib/utils/export';
 */

export async function exportToExcel(
    data: Record<string, unknown>[],
    filename: string,
    sheetName = 'Sheet1'
) {
    // Dynamic import to keep xlsx out of the server bundle
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
