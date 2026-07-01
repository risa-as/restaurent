'use client';

import { useState } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface ColumnDef<T> {
    key: keyof T | string;
    header: string;
    cell?: (row: T) => React.ReactNode;
    sortable?: boolean;
    className?: string;
}

interface DataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    emptyState?: {
        icon?: LucideIcon;
        title: string;
        description: string;
    };
    searchable?: boolean;
    searchPlaceholder?: string;
    searchKeys?: (keyof T)[];
    className?: string;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    emptyState,
    searchable,
    searchPlaceholder = 'بحث...',
    searchKeys = [],
    className,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const [search, setSearch] = useState('');

    function handleSort(key: string) {
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir('asc');
        } else if (sortDir === 'asc') {
            setSortDir('desc');
        } else {
            setSortKey(null);
            setSortDir(null);
        }
    }

    let rows = [...data];

    if (searchable && search.trim() && searchKeys.length > 0) {
        const q = search.toLowerCase();
        rows = rows.filter(row =>
            searchKeys.some(k => String(row[k] ?? '').toLowerCase().includes(q))
        );
    }

    if (sortKey && sortDir) {
        rows.sort((a, b) => {
            const av = a[sortKey] ?? '';
            const bv = b[sortKey] ?? '';
            const cmp = String(av).localeCompare(String(bv), 'ar');
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }

    const SortIcon = ({ colKey }: { colKey: string }) => {
        if (sortKey !== colKey) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
        return sortDir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />;
    };

    const EmptyIcon = emptyState?.icon ?? Package;

    return (
        <div className={cn('space-y-3', className)}>
            {searchable && (
                <div className="relative max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pr-9"
                    />
                </div>
            )}
            <div className="rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            {columns.map(col => (
                                <TableHead key={String(col.key)} className={cn('text-right', col.className)}>
                                    {col.sortable ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 gap-1 font-medium hover:bg-transparent"
                                            onClick={() => handleSort(String(col.key))}
                                        >
                                            {col.header}
                                            <SortIcon colKey={String(col.key)} />
                                        </Button>
                                    ) : col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="p-0">
                                    <EmptyState
                                        icon={EmptyIcon}
                                        title={emptyState?.title ?? 'لا توجد بيانات'}
                                        description={emptyState?.description ?? 'لم يتم العثور على أي عناصر'}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : rows.map((row, i) => (
                            <TableRow key={i}>
                                {columns.map(col => (
                                    <TableCell key={String(col.key)} className={cn('text-right', col.className)}>
                                        {col.cell
                                            ? col.cell(row)
                                            : String(row[String(col.key)] ?? '—')}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
