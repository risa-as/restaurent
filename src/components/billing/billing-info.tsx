'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Smartphone, Info, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFmt } from '@/contexts/number-locale-context';

interface BillingInfoProps {
    bankName: string;
    bankAccount: string;
    bankAccountName: string;
    bankIban?: string;
    zainCashNumber: string;
    usdToIqdRate?: number;
}

function CopyButton({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast({ title: `✅ تم نسخ ${label}` });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
            title={`نسخ ${label}`}
        >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

export default function BillingInfo({ bankName, bankAccount, bankAccountName, bankIban, zainCashNumber, usdToIqdRate }: BillingInfoProps) {
    const fmt = useFmt();
    const hasBankInfo = bankName || bankAccount || bankAccountName || bankIban;
    const hasZainCash = !!zainCashNumber;

    if (!hasBankInfo && !hasZainCash) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Info className="w-4 h-4" />
                        <p className="text-sm">لم يتم إضافة معلومات الدفع بعد. يرجى التواصل مع إدارة المنصة.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {hasBankInfo && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            حوالة مصرفية
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 text-sm">
                        {bankName && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">اسم المصرف</span>
                                <span className="font-semibold">{bankName}</span>
                            </div>
                        )}
                        {bankAccountName && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">اسم صاحب الحساب</span>
                                <span className="font-semibold">{bankAccountName}</span>
                            </div>
                        )}
                        {bankAccount && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">رقم الحساب</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono font-bold text-base">{bankAccount}</span>
                                    <CopyButton value={bankAccount} label="رقم الحساب" />
                                </div>
                            </div>
                        )}
                        {bankIban && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">IBAN</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono font-bold text-sm" dir="ltr">{bankIban}</span>
                                    <CopyButton value={bankIban} label="IBAN" />
                                </div>
                            </div>
                        )}
                        {usdToIqdRate && usdToIqdRate > 1 && (
                            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                                سعر الصرف: 1 USD = {fmt(usdToIqdRate)} د.ع
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {hasZainCash && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-green-600" />
                            زين كاش
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">رقم المحفظة</span>
                            <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-base" dir="ltr">{zainCashNumber}</span>
                                <CopyButton value={zainCashNumber} label="رقم زين كاش" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
