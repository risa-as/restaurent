
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50 mb-4" />
            <p className="text-muted-foreground animate-pulse">جاري التحميل...</p>
        </div>
    );
}
