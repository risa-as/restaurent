import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Icon className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
            </div>
            {action && (
                <Button variant="outline" size="sm" onClick={action.onClick} className="mt-2">
                    {action.label}
                </Button>
            )}
        </div>
    );
}
