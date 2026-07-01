'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, GitBranch, MapPin, Phone, CheckCircle2, AlertCircle, Pencil, X } from 'lucide-react';
import { createBranch, updateBranch, toggleBranchActive } from '@/lib/actions/branches';
import { useRouter } from 'next/navigation';

interface Branch {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    isActive: boolean;
    serviceMode: string;
    isMainBranch: boolean;
}

interface BranchesManagerProps {
    branches: Branch[];
}

const SERVICE_MODE_LABELS: Record<string, string> = {
    TABLE_SERVICE: 'خدمة طاولات',
    QUICK_SERVICE: 'خدمة سريعة',
};

function BranchCard({ branch, isPending, onToggle, onSaved, onError }: {
    branch: Branch;
    isPending: boolean;
    onToggle: (id: string) => void;
    onSaved: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(branch.name);
    const [editAddress, setEditAddress] = useState(branch.address ?? '');
    const [editPhone, setEditPhone] = useState(branch.phone ?? '');
    const [editServiceMode, setEditServiceMode] = useState(branch.serviceMode);
    const [saving, startSave] = useTransition();
    const router = useRouter();

    function handleEdit() {
        setEditName(branch.name);
        setEditAddress(branch.address ?? '');
        setEditPhone(branch.phone ?? '');
        setEditServiceMode(branch.serviceMode);
        setEditing(true);
    }

    function handleSave() {
        startSave(async () => {
            const res = await updateBranch(branch.id, {
                name: editName.trim() || branch.name,
                address: editAddress.trim() || undefined,
                phone: editPhone.trim() || undefined,
                serviceMode: editServiceMode as any,
            });
            if (res.success) {
                setEditing(false);
                onSaved('تم تحديث الفرع بنجاح');
                router.refresh();
            } else {
                onError(res.error || 'فشل تحديث الفرع');
            }
        });
    }

    return (
        <Card className={branch.isActive ? '' : 'opacity-60'}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <GitBranch className="w-4 h-4 text-primary shrink-0" />
                        <CardTitle className="text-base truncate">{branch.name}</CardTitle>
                        {branch.isMainBranch && <Badge variant="outline" className="text-xs shrink-0">رئيسي</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={branch.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                            {branch.isActive ? 'نشط' : 'معطّل'}
                        </Badge>
                        {!editing && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} disabled={isPending}>
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
                {!editing ? (
                    <>
                        {branch.address && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {branch.address}
                            </div>
                        )}
                        {branch.phone && (
                            <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                {branch.phone}
                            </div>
                        )}
                        <p className="text-xs font-medium">{SERVICE_MODE_LABELS[branch.serviceMode] || branch.serviceMode}</p>
                        {!branch.isMainBranch && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => onToggle(branch.id)}
                                disabled={isPending}
                            >
                                {branch.isActive ? 'تعطيل الفرع' : 'تفعيل الفرع'}
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="space-y-3 pt-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs">اسم الفرع *</Label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">العنوان</Label>
                            <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} className="h-8 text-sm" placeholder="شارع ..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">رقم الهاتف</Label>
                            <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-8 text-sm" dir="ltr" placeholder="07XX..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">نظام الخدمة</Label>
                            <Select value={editServiceMode} onValueChange={setEditServiceMode}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TABLE_SERVICE">خدمة طاولات</SelectItem>
                                    <SelectItem value="QUICK_SERVICE">خدمة سريعة</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving || !editName.trim()}>
                                {saving ? 'جاري الحفظ...' : 'حفظ'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function BranchesManager({ branches }: BranchesManagerProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [serviceMode, setServiceMode] = useState('TABLE_SERVICE');
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState('');

    function handleCreate() {
        if (!name.trim()) return;
        setError('');
        startTransition(async () => {
            const res = await createBranch({ name, address: address || undefined, phone: phone || undefined, serviceMode: serviceMode as any });
            if (res.success) {
                setFeedback('تم إنشاء الفرع بنجاح');
                setName(''); setAddress(''); setPhone(''); setServiceMode('TABLE_SERVICE');
                setShowForm(false);
                router.refresh();
            } else {
                setError(res.error || 'فشل إنشاء الفرع');
            }
        });
    }

    function handleToggle(id: string) {
        startTransition(async () => {
            const res = await toggleBranchActive(id);
            if (res.success) router.refresh();
            else setError(res.error || 'فشل تغيير حالة الفرع');
        });
    }

    return (
        <div className="space-y-4">
            {feedback && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {feedback}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Branches list */}
            <div className="grid sm:grid-cols-2 gap-4">
                {branches.map(branch => (
                    <BranchCard
                        key={branch.id}
                        branch={branch}
                        isPending={isPending}
                        onToggle={handleToggle}
                        onSaved={msg => { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); }}
                        onError={msg => setError(msg)}
                    />
                ))}
            </div>

            {/* Add branch button / form */}
            {!showForm ? (
                <Button variant="outline" className="gap-2" onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4" />
                    إضافة فرع جديد
                </Button>
            ) : (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">فرع جديد</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                            <Label>اسم الفرع *</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="فرع الكرادة" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>العنوان</Label>
                            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="شارع ..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label>رقم الهاتف</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX..." dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>نظام الخدمة</Label>
                            <Select value={serviceMode} onValueChange={setServiceMode}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TABLE_SERVICE">خدمة طاولات</SelectItem>
                                    <SelectItem value="QUICK_SERVICE">خدمة سريعة</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={handleCreate} disabled={isPending || !name.trim()}>
                                إنشاء الفرع
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
