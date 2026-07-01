"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryStation {
    id: string;
    name: string;
}

interface KitchenNavProps {
    stations?: CategoryStation[];
}

export function KitchenNav({ stations = [] }: KitchenNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeStation = searchParams.get("station");

    return (
        <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
                <Link href="/kitchen">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "gap-2 whitespace-nowrap transition-all active:scale-95",
                            pathname === "/kitchen" && !activeStation
                                ? "bg-background text-primary shadow-sm hover:bg-background hover:text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        لوحة المطبخ
                    </Button>
                </Link>

                {stations.map((station) => {
                    const stationHref = `/kitchen?station=${station.id}`;
                    const active = pathname === "/kitchen" && activeStation === station.id;

                    return (
                        <Link key={station.id} href={stationHref}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "gap-2 whitespace-nowrap transition-all active:scale-95",
                                    active
                                        ? "bg-background text-primary shadow-sm hover:bg-background hover:text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <ChefHat className="h-4 w-4" />
                                {station.name}
                            </Button>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
