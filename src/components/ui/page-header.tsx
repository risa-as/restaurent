import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    breadcrumbs?: Breadcrumb[];
    className?: string;
}

export function PageHeader({ title, subtitle, actions, breadcrumbs, className }: PageHeaderProps) {
    return (
        <div className={cn('space-y-2', className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                    {breadcrumbs.map((crumb, i) => (
                        <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ChevronLeft className="w-3.5 h-3.5" />}
                            {crumb.href ? (
                                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="text-foreground font-medium">{crumb.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{title}</h1>
                    {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
        </div>
    );
}
