import type { Metadata, Viewport } from "next";
import { Inter, Tajawal } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { TenantEnforcer } from "@/components/tenant/tenant-enforcer";
import { SessionExpiryWatcher } from "@/components/providers/session-expiry-watcher";
import { AuthProvider } from "@/components/providers/auth-provider";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hexToHsl } from "@/lib/utils";
import { NumberLocaleProvider } from "@/contexts/number-locale-context";
import { DEFAULT_NUMBER_LOCALE, NUMBER_LOCALE_OPTIONS, type NumberLocale } from "@/lib/number-locale";

// Arabic UI font — modern, designed for screens
const tajawal = Tajawal({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

// Latin numbers and English labels
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

// ── Dynamic metadata — reads appName from DB ──────────────────────────────
export async function generateMetadata(): Promise<Metadata> {
  let appTitle = "نظام إدارة المطعم";
  let appDescription = "منصة متكاملة لإدارة المطعم — الطلبات، المخزون، الكاشير، المطبخ";
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      select: { appName: true, name: true },
      orderBy: { createdAt: 'asc' }
    });
    if (tenant?.appName) appTitle = tenant.appName;
    else if (tenant?.name) appTitle = tenant.name;
    if (tenant?.name) appDescription = `نظام إدارة ${tenant.name}`;
  } catch { /* non-fatal */ }

  return {
    title: {
      template: '%s | ريستو',
      default: appTitle,
    },
    description: appDescription,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      title: appTitle,
      statusBarStyle: "black-translucent",
      startupImage: "/apple-touch-icon.png",
    },
    icons: {
      icon: [
        { url: "/favicon.ico?v=4", sizes: "any" },
        { url: "/icon-192.png?v=4", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png?v=4", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }],
      shortcut: "/icon-192.png?v=4",
    },
    openGraph: {
      title: appTitle,
      description: appDescription,
      type: "website",
      locale: "ar_IQ",
    },
    other: {
      "mobile-web-app-capable": "yes",
      "msapplication-TileColor": "#f97316",
      "msapplication-TileImage": "/icon-192.png",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = headers();
  const slug = headersList.get('x-tenant-slug');
  const isRoot = headersList.get('x-is-root-domain') === 'true';

  // Identify the active tenant: prefer the logged-in user's tenant so branding
  // and number locale follow the account (not just "the first tenant", which
  // broke once a second restaurant existed on the same localhost instance).
  const session = await auth().catch(() => null);
  const sessionTenantId = (session?.user as any)?.tenantId as string | undefined;

  const buildColor = (hex?: string | null): React.CSSProperties | undefined => {
    if (!hex) return undefined;
    const hslColor = hexToHsl(hex);
    return { '--primary': hslColor, '--ring': hslColor } as React.CSSProperties;
  };

  // Read number locale — prefer the logged-in tenant's settings.
  let numberLocale = DEFAULT_NUMBER_LOCALE;
  try {
    const settings = sessionTenantId
      ? await prisma.systemSetting.findUnique({ where: { tenantId: sessionTenantId }, select: { numberLocale: true } })
      : await prisma.systemSetting.findFirst({ select: { numberLocale: true } });
    const stored = settings?.numberLocale;
    if (stored && NUMBER_LOCALE_OPTIONS.some(o => o.value === stored)) {
      numberLocale = stored as NumberLocale;
    }
  } catch { /* non-fatal */ }

  let customPrimaryColor: React.CSSProperties | undefined = undefined;

  // 1. عبر الـ slug (multi-tenant subdomains)
  if (slug && !isRoot) {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { primaryColor: true } });
      customPrimaryColor = buildColor(tenant?.primaryColor);
    } catch { /* non-fatal */ }
  }

  // 2. عبر مطعم المستخدم المسجّل دخوله (يتبع الحساب)
  if (!customPrimaryColor && sessionTenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: sessionTenantId }, select: { primaryColor: true } });
      customPrimaryColor = buildColor(tenant?.primaryColor);
    } catch { /* non-fatal */ }
  }

  // 3. fallback: أول tenant نشط (local/single-tenant setup)
  if (!customPrimaryColor) {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { isActive: true },
        select: { primaryColor: true },
        orderBy: { createdAt: 'asc' }
      });
      customPrimaryColor = buildColor(tenant?.primaryColor);
    } catch { /* non-fatal */ }
  }

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${tajawal.variable} ${inter.variable} font-[family-name:var(--font-arabic)] antialiased`}
        style={customPrimaryColor}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <NumberLocaleProvider locale={numberLocale}>
              <TenantEnforcer />
              <SessionExpiryWatcher />
              <TooltipProvider>
                {children}
              </TooltipProvider>
              <Toaster />
              <PwaInstallPrompt />
            </NumberLocaleProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
