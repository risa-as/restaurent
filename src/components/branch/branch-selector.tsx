'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch, Loader2 } from 'lucide-react';
import { setSelectedBranch } from '@/lib/actions/branches';

interface Branch {
    id: string;
    name: string;
    isMainBranch: boolean;
    isActive: boolean;
    serviceMode: string;
}

interface BranchSelectorProps {
    branches: Branch[];
    selectedBranchId: string | null;
}

export function BranchSelector({ branches, selectedBranchId }: BranchSelectorProps) {
    const activeBranches = branches.filter(b => b.isActive);

    const serverValue =
        selectedBranchId ??
        activeBranches.find(b => b.isMainBranch)?.id ??
        activeBranches[0]?.id ??
        '';

    // All hooks before early return
    const [selectedId, setSelectedId] = useState(serverValue);
    const [isPending, setIsPending] = useState(false);

    if (activeBranches.length <= 1) return null;

    function handleChange(branchId: string) {
        setSelectedId(branchId);
        setIsPending(true);

        setSelectedBranch(branchId).then(() => {
            // Hard-navigate to the current URL so the server always sees the
            // updated cookie. router.refresh() can hit the Router Cache even
            // after the cookie changes; window.location.reload() never does.
            window.location.reload();
        });
    }

    return (
        <div className="flex items-center gap-2">
            {isPending
                ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                : <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
            }
            <Select value={selectedId} onValueChange={handleChange} disabled={isPending}>
                <SelectTrigger className="h-8 w-[160px] text-sm">
                    <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                    {activeBranches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                            {branch.isMainBranch && ' (رئيسي)'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
