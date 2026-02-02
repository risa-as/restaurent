'use client';

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            طباعة
        </Button>
    );
}
