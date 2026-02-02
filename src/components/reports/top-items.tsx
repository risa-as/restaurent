import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TopItemsProps {
    items: { name: string; quantity: number; image?: string | null }[];
}

export function TopItems({ items }: TopItemsProps) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>الأصناف الأكثر مبيعًا</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={item.image || ''} alt={item.name} />
                                <AvatarFallback>{item.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{item.name}</p>
                                <p className="text-xs text-muted-foreground">الترتيب #{i + 1}</p>
                            </div>
                            <div className="ml-auto font-medium">
                                {item.quantity} بيع
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <p className="text-muted-foreground text-sm">لا توجد بيانات متاحة</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
