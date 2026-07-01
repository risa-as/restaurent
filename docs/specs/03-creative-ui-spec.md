# 🎨 Creative UI/UX Specification — Restaurant Management System
### `docs/specs/03-creative-ui-spec.md`

> **Author**: UI/UX Architect (AI)
> **Date**: 2026-03-03
> **Phase**: 5 — Creative Direction & Design System
> **Rule**: This document is SPEC ONLY. No React/CSS code. No modifications to `src/lib/actions/` or `prisma/schema.prisma`.

---

## Vision Statement

> "The best local restaurant management system in Iraq — fast as thought, beautiful as a five-star hotel, and readable from across a busy kitchen."

The system serves **6 distinct human roles** across **3 physical environments** (front-of-house screens, kitchen displays, and manager dashboards). Each environment demands a radically different UX contract. This spec defines how to honor all three without fragmenting the design.

---

## Part 1 — Design System & Visual Identity

### 1.1 The Color Palette: "Night Market" 🌙

After deep consideration, I'm recommending a departure from the current warm orange approach in favor of the **"Night Market"** palette. Here's my reasoning:

#### Why NOT Orange?
Orange is energetic but creates two problems in a restaurant context:
1. **Kitchen fatigue**: Orange backgrounds under fluorescent kitchen lighting cause eye strain after a 12-hour shift.
2. **Sameness**: Most Iraqi restaurant apps use warm red/orange. We want to stand out as *premium* and *modern*.

#### The New Direction: Deep Indigo + Warm Ivory + Saffron Gold

| Role | Emotion We Target | How Color Achieves It |
|------|--------------------|----------------------|
| Manager Dashboard | Authority, clarity, control | Deep Indigo primary — used by enterprise tools (Linear, Vercel) |
| POS / Cashier | Speed, confidence, accuracy | High-contrast Saffron Gold CTAs on dark panels |
| Kitchen Display | Urgency, visibility, calm | Near-black background with pure white type — maximizes legibility at 3m+ |

#### Light Mode Palette

| Token | Value (HSL) | Hex Reference | Purpose |
|-------|-------------|---------------|---------|
| `--brand-deep` | `246 47% 25%` | `#2D2B6B` | Rich Deep Indigo — sidebar, nav |
| `--primary` | `246 80% 58%` | `#4F46E5` | Electric Indigo — buttons, active states |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | White on primary |
| `--accent` | `42 100% 53%` | `#F5A623` | Saffron Gold — CTAs, badges, highlights |
| `--accent-foreground` | `20 14% 10%` | `#1C1917` | Dark text on gold |
| `--background` | `220 20% 97%` | `#F4F5F9` | Cool off-white (avoids warm yellow tint) |
| `--foreground` | `222 47% 11%` | `#0F172A` | Slate 900 — body text |
| `--card` | `0 0% 100%` | `#FFFFFF` | Pure white cards |
| `--card-foreground` | `222 47% 11%` | `#0F172A` | |
| `--muted` | `220 14% 94%` | `#EEF0F5` | Inactive areas |
| `--muted-foreground` | `220 10% 48%` | `#6B7280` | Placeholder text |
| `--border` | `220 13% 88%` | `#DDE1EC` | Subtle borders |
| `--ring` | `246 80% 58%` | `#4F46E5` | Focus rings |
| `--destructive` | `0 84% 60%` | `#EF4444` | Errors, delete |
| `--secondary` | `246 40% 95%` | `#EEF0FF` | Indigo-tinted backgrounds |

#### Dark Mode Palette

| Token | Value (HSL) | Purpose |
|-------|-------------|---------|
| `--background` | `222 47% 7%` | Deep navy near-black |
| `--card` | `222 40% 10%` | Slightly lighter card surfaces |
| `--primary` | `246 80% 65%` | Brighter indigo (pops on dark bg) |
| `--accent` | `42 100% 58%` | Saffron stays vivid |
| `--muted` | `222 30% 16%` | Dark muted areas |
| `--muted-foreground` | `220 15% 56%` | Softer text |
| `--border` | `222 30% 20%` | Dark borders |
| `--foreground` | `210 40% 96%` | Near-white body text |

#### WHY This Palette Wins
1. **Electric Indigo** is used by Linear, Vercel, Notion — it communicates modern, professional software. It will immediately make this system feel premium vs. any other Iraqi restaurant software.
2. **Saffron Gold** is culturally resonant in Iraq (think gold domes, luxury, quality) without being cliché. It creates natural attention on the most important CTA on each screen.
3. **Cool off-white background** reduces eye fatigue for staff using screens 8-12 hours/day. The warm backgrounds in typical restaurant software are a mistake.
4. **Deep Navy dark mode** for the kitchen: near-black (`#0D1526`) with pure white text achieves the highest contrast ratio (>18:1), critical for readability across a hot, steam-filled kitchen.

---

### 1.2 Typography System

#### Font Stack

| Use Case | Font | Why |
|----------|------|-----|
| Arabic body text | `Tajawal` (400, 500, 700) | Modern, geometric, reads beautifully at small sizes. Better than Noto Kufi for UI because it has more weight variants |
| Arabic headings | `Tajawal` 700/800 | Same family = harmony |
| Numbers & prices | `Inter` (or `JetBrains Mono` for POS) | Latin numerals in Inter are perfectly formed, `JetBrains Mono` makes prices instantly scannable |
| English labels | `Inter` | Industry standard |

#### Why Tajawal over Noto Kufi Arabic?
- Noto Kufi is traditionally calligraphic — beautiful but slightly formal/heavy
- Tajawal is **designed specifically for UX** — clean strokes, optimized for screen display
- Tajawal has 7 weight levels (100–900) giving full design control

#### Type Scale (Arabic RTL Context)

| Level | Size | Weight | Use |
|-------|------|--------|-----|
| `display` | 36px | 800 | Kitchen order numbers |
| `h1` | 28px | 700 | Page headings |
| `h2` | 22px | 600 | Section titles |
| `h3` | 18px | 600 | Card titles |
| `body` | 15px | 400 | Standard text |
| `caption` | 13px | 500 | Metadata, timestamps |
| `micro` | 11px | 500 | Badges, tags |

#### RTL Rules
- Root `<html>` has `dir="rtl" lang="ar"`
- Sidebar placed on **right side** (not left) — aligns with Arabic reading direction
- Icons that imply direction (chevrons, arrows) must be **mirrored** in RTL
- Price format: `15,000 د.ع` — use `Intl.NumberFormat` with `ar-IQ` locale
- Directional utility: `ms-auto` (margin-start) instead of `mr-auto` for RTL-safe spacing

---

### 1.3 CSS Variables Strategy

#### Architecture: Three Tiers

```
Tier 1: Base tokens (primitive values)
  ↓ Consumed by
Tier 2: Semantic tokens (--primary, --card, --muted...)
  ↓ Consumed by
Tier 3: Component tokens (--sidebar-width, --header-height, --kitchen-card-min-height)
```

**Tier 3 additions** (new — not in current implementation):

| Variable | Value | Purpose |
|----------|-------|---------|
| `--sidebar-width` | `240px` | Expanded sidebar width |
| `--sidebar-collapsed-width` | `60px` | Icon-only sidebar |
| `--header-height` | `64px` | Sticky header height |
| `--card-radius` | `12px` | Consistent border radius everywhere |
| `--kitchen-font-scale` | `1.2` | Multiplier applied to all kitchen text |
| `--pos-card-size` | `130px` | Menu item card minimum touch target |
| `--pos-button-height` | `64px` | CTA button height on POS |

> **Key Principle**: If a layout changes (e.g., sidebar becomes 256px), you change **one variable**, not dozens of `w-60` Tailwind classes scattered across 9 layouts.

#### Status Color Semantic Variables (Kitchen-Critical)

| Variable | Light Mode HSL | Dark Mode HSL | Meaning |
|----------|---------------|---------------|---------|
| `--status-pending` | `42 100% 53%` | `42 100% 60%` | Waiting — Saffron (brand-aligned) |
| `--status-preparing` | `246 80% 58%` | `246 80% 68%` | In progress — Primary Indigo |
| `--status-ready` | `142 71% 45%` | `142 60% 55%` | Done — Success Green |
| `--status-late` | `0 84% 60%` | `0 80% 65%` | Overdue — Destructive Red |
| `--status-late-pulse` | animated | animated | CSS `@keyframes pulse` on red border |

---

## Part 2 — Component Architecture

### 2.1 Universal Layout Shell Structure

```
app/layout.tsx (root — Server Component)
└── <html lang="ar" dir="rtl">
    └── ThemeProvider (Client — next-themes)
        ├── TooltipProvider (for collapsed sidebar tooltips)
        │
        ├── /dashboard/** → DashboardLayout
        │   ├── GlobalSidebar (right side, collapsible)  ← NEW
        │   └── DashboardShell
        │       ├── GlobalHeader (sticky top)            ← NEW
        │       └── <main> children
        │
        ├── /kitchen/** → KitchenLayout
        │   └── KitchenShell (fullscreen, dark-forced)   ← REDESIGNED
        │
        ├── /cashier → CashierLayout
        │   └── POSShell (full-height, no outer padding)  ← REDESIGNED
        │
        └── /accountant|/captain|/delivery|/waiter|/inventory
            └── RoleLayout (RoleHeader with ThemeToggle)  ← UPDATED
```

### 2.2 `GlobalSidebar` Specification

**Location**: `src/components/layout/global-sidebar.tsx`
**Type**: Client Component (`'use client'`)
**Placement**: **Right side** (RTL — `border-l` not `border-r`)

#### Anatomy (top to bottom):
```
┌─────────────────────────────┐
│  🍴 [Logo] نظام المطعم      │ ← Brand header (64px)
│         ▶ [collapse btn]    │ ← Absolute positioned toggle
├─────────────────────────────┤
│  🏠 لوحة التحكم             │ ← Active: bg-primary text-white
│  🪑 الطاولات                │ ← Hover: bg-accent/10
│  💰 الكاشير                 │
│  🍳 المطبخ                  │
│  📦 المخزون                 │
│  📊 التقارير                │
│  ⚙️ الإعدادات               │
├─────────────────────────────┤
│  👤 أحمد محمد               │ ← User info
│  🔴 [تسجيل الخروج]          │ ← Destructive ghost button
└─────────────────────────────┘
```

#### States:
- **Expanded** (`w-60`): Icon + Arabic label + badge (for counts)
- **Collapsed** (`w-16`): Icon only + Tooltip on hover
- **Transition**: `transition-all duration-300 ease-in-out`
- **State persistence**: `localStorage.getItem('sidebar-collapsed')` — remembers user preference

#### Role Filtering Matrix:

| Link | ADMIN | MANAGER | CASHIER | CHEF | CAPTAIN | WAITER | DRIVER | ACCOUNTANT |
|------|-------|---------|---------|------|---------|--------|--------|------------|
| Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tables | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| POS/Cashier | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kitchen | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Finance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delivery | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Admin Panel | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 2.3 `GlobalHeader` Specification

**Location**: `src/components/layout/global-header.tsx`
**Type**: Server Component (async — reads session)
**Height**: `64px` (`h-16`)

#### Anatomy:
```
┌──────────────────────────────────────────────────────────────────┐
│  [Page Title]          [🔔 Bell]  [☀️ Theme]  [Avatar ▾ Menu]  │
└──────────────────────────────────────────────────────────────────┘
```

- **Page title**: Client `<PageTitle />` sub-component using `usePathname()` → path map
- **Bell icon**: Static for now, reserved for notification system
- **Theme toggle**: `ThemeToggle` dropdown (Light/Dark/System)
- **User menu**: Avatar (initials), name, role pill badge, Settings link, Sign out
- **Sticky**: `position: sticky; top: 0; z-index: 10;` with `backdrop-blur-sm`

### 2.4 Navigation Unification Principle

Before: 9 separate layouts with 9 different headers, inconsistent sign-out logic, different avatar implementations.

After: **One source of truth per role type**:
- `GlobalSidebar` — all dashboard-family routes
- `RoleHeader` — all standalone role routes (kitchen, POS, delivery, etc.)
- Both include: ThemeToggle, UserNav, Arabic page title

---

## Part 3 — Role-Specific Ergonomics

### 3.1 POS (Cashier/Captain) — "Velocity Interface"

**Design Principle**: Zero cognitive load. Every interaction should be *instinctive*.

#### Screen Layout (any screen ≥ 1024px):

```
┌─────────────────────────────────────────────────────────┐
│  [Header: RoleHeader with title + ThemeToggle + User]   │
├────────────────────────────────┬────────────────────────┤
│  MENU PANEL (70%)              │  ORDER PANEL (30%)      │
│                                │                         │
│  ┌──────────────────────────┐  │  الطلب الحالي           │
│  │ 🔍 بحث في القائمة...    │  │  ─────────────────────  │
│  └──────────────────────────┘  │  🍕 بيتزا × 2          │
│                                │     12,000 د.ع          │
│  [الكل] [مقبلات] [رئيسي] →   │  🥤 عصير × 1  5,000     │
│                                │  ─────────────────────  │
│  ┌──────┐ ┌──────┐ ┌──────┐  │  المجموع: 17,000 د.ع    │
│  │ 🍕  │ │ 🍔  │ │ 🍗  │  │                          │
│  │      │ │      │ │      │  │  الطاولة: [رقم ▼]       │
│  │بيتزا │ │برغر │ │دجاج  │  │  ملاحظة: [نص...]        │
│  │6,000 │ │4,500 │ │5,000 │  │                          │
│  └──────┘ └──────┘ └──────┘  │  ┌──────────────────┐   │
│   ↑ 130×130px touch target    │  │  💳 إرسال الطلب  │   │
│                                │  │    17,000 د.ع    │   │
│  (grid: 3→4→5 cols responsive) │  └──────────────────┘   │
│                                │  ↑ h-16, full-width,    │
│                                │    Saffron Gold accent   │
└────────────────────────────────┴────────────────────────┘
```

#### Key UX Rules for POS:
1. **Single-tap to add**: Tap card → item added immediately. No modals.
2. **Quantity: tap repeatedly** or use the +/- in the order panel (32px buttons)
3. **Category tabs**: `h-12`, font-semibold, horizontal scroll, active = indigo pill
4. **Menu card**: `130×130px` minimum. Image top 60%, name + price bottom 40%. Bold price in gold.
5. **No-image fallback**: Category emoji (🍕🍔🥗) instead of "لا توجد صورة" — looks professional
6. **Offer badge**: "خصم" in red badge, top-right corner of card image
7. **Charge button**: `h-16`, Saffron Gold (`bg-accent`), shows total inside button text
8. **Captain orders panel**: Slide-in sheet from right, pulsing orange notification badge
9. **Empty cart state**: Friendly illustration + Arabic prompt "ابدأ بإضافة أصناف من القائمة"

#### POS Color Decisions:
- Card hover: `border-primary/50 shadow-lg` — subtle indigo glow
- Active/selected category: `bg-primary text-white` pill
- Charge button: `bg-accent text-accent-foreground font-black` — Saffron Gold stands out immediately

---

### 3.2 Kitchen Display System (KDS) — "Command Center"

**Design Principle**: Readable from 3 meters. Touch-friendly with gloved hands. Urgency at a glance.

#### Screen Layout:

```
┌────────────────────────────────────────────────────────────────┐
│  🍳 بوابة الطهي — نظام المطبخ الذكي          [🌙] [القسم▼]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │    #142      │  │    #143      │  │    #144      │        │
│  │  طاولة 5    │  │    سفري     │  │  طاولة 2    │        │
│  │  ⏱ 3 دقائق  │  │  ⏱ 12 دقيقة │  │  ⏱ 18 دق ⚡ │        │
│  │  ──────────  │  │  ──────────  │  │  ──────────  │        │
│  │ ×2 بيتزا   │  │ ×1 برغر     │  │ ×3 دجاج     │        │
│  │ ×1 سلطة    │  │ ×2 بطاطا    │  │ ----         │        │
│  │  ──────────  │  │  ──────────  │  │ ⚠️ بدون ملح │        │
│  │             │  │             │  │              │        │
│  │ [▶ بدء]    │  │ [✓ إنهاء]   │  │ [🚨 متأخر!] │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│   PENDING (blue)    PREPARING (indigo)  LATE (red pulse)       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Card Design Specification:

| Element | Spec | Rationale |
|---------|------|-----------|
| Order number | `text-5xl font-black` (#142) | Readable from 3m |
| Table label | `text-lg font-bold` | Secondary info |
| Time elapsed | `text-2xl font-bold` counter | Urgency driver |
| Item name | `text-lg font-bold` min | Misreading = wrong food |
| Quantity | `40×40px pill, bg-primary text-white` | Instant read |
| Card height | `min-h-[260px]` | Consistent grid |
| Card border | `border-4` status-colored | Status at a glance |
| Action button | `h-14 text-lg font-bold` | Works with glove on |

#### Status Color Logic (border + background tint):

| Status | Border | Background | Button | Timeline |
|--------|--------|-----------|--------|----------|
| PENDING | `--status-pending` (Saffron) | `saffron/8%` | "▶ بدء" — Indigo | 0-9 min: normal |
| PREPARING | `--status-preparing` (Indigo) | `indigo/6%` | "✓ إنهاء" — Saffron | |
| LATE | `--status-late` (Red) | `red/8%` | "🚨 متأخر!" — Red | ≥15 min: pulse |
| READY | `--status-ready` (Green) | `green/8%` | "✅ جاهز" — disabled | |

#### Time Urgency System:
- `elapsed < 10m` → time in muted color
- `elapsed >= 10m` → time in `--status-pending` (amber)
- `elapsed >= 15m` → time in `--status-late` (red) + card border pulses + badge "⚡"
- All animations done with CSS `@keyframes pulse` — no JS overhead

#### Auto-Refresh Strategy:
- **Primary**: `router.refresh()` every 30 seconds via `setInterval` in a `useEffect`
- **Enhancement (future)**: WebSocket or Server-Sent Events for real-time push
- **Loading UX**: Skeleton cards during refresh (not blank screen)

#### KDS Forced Dark Mode:
The kitchen display should **always** be dark — regardless of system theme — because:
- Ambient light in kitchens is warm/yellow → dark screen contrast is superior
- Energy consumption (OLED screens)
- Chef comfort over long shifts

Implementation: `data-force-dark="true"` attribute on the kitchen layout root, combined with CSS:
```
[data-force-dark="true"] { color-scheme: dark; }
```
No user override — this is a design decision for ergonomics.

---

### 3.3 Manager Dashboard & Finance — "Mission Control"

**Design Principle**: Dense information, instantly readable. Enterprise-grade clarity.

#### Dashboard Layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  [GlobalHeader: لوحة التحكم | Bell | Theme | User]              │
├──────────────────────────────────────────────────────────────┤
│  [Sidebar: GlobalSidebar right]  │  MAIN CONTENT              │
│                                  │                            │
│  🏠 لوحة التحكم ● (active)      │  KPI Cards Row (4 cols)    │
│  🪑 الطاولات                    │  ┌─────┐┌─────┐┌─────┐┌──┐ │
│  💰 الكاشير                     │  │💰   ││🛒   ││🍽️  ││📦│ │
│  🍳 المطبخ                      │  │Total││Orders││Tables││ ..│ │
│  📦 المخزون                     │  │sales││today ││open  ││   │ │
│  📊 التقارير                    │  └─────┘└─────┘└─────┘└──┘ │
│  ─────────────────               │                            │
│  👤 أحمد (ADMIN)                │  Revenue LineChart (full w) │
│  🔴 تسجيل الخروج               │  ┌─────────────────────────┐ │
│                                  │  │   الإيرادات بمرور الزمن││
│                                  │  │   (Indigo line, themed) │ │
│                                  │  └─────────────────────────┘ │
│                                  │                            │
│                                  │  [Category PieChart] [Table] │
└─────────────────────────────────────────────────────────────────┘
```

#### KPI Card Design:

```
┌──────────────────────────────┐
│  💰  إجمالي المبيعات اليوم   │
│                              │
│  1,250,000 د.ع              │  ← text-3xl font-black
│  ↑ +12% من أمس              │  ← text-sm text-green-500
└──────────────────────────────┘
  rounded-xl shadow-md border bg-card
  Icon: p-2 rounded-lg bg-primary/10 text-primary
```

#### Chart System Rules:

| Chart | Type | Primary Color | Notes |
|-------|------|--------------|-------|
| Revenue over time | `LineChart` | `--chart-1` (Indigo) | Area fill at 20% opacity |
| Sales by category | `PieChart` (donut) | `--chart-1..5` | `innerRadius=80 outerRadius=110` |
| Orders heatmap | `BarChart` | `--chart-2` (Green) | By hour of day |
| Expense breakdown | `BarChart` stacked | `--chart-3..5` | Weekly view |

#### `useChartColors()` Hook Contract:
```typescript
// Returns live hex values read from document CSS vars
// Safe for SSR (returns brand defaults on server)
interface ChartColors {
  chart1: string  // primary (indigo)
  chart2: string  // success (green)
  chart3: string  // info (blue)
  chart4: string  // warning (gold)
  chart5: string  // purple
  grid: string    // --border → grid lines
  label: string   // --muted-foreground → axis text
  tooltip: {
    bg: string    // --card
    border: string
    text: string  // --foreground
  }
}
```

---

## Part 4 — Micro-Interactions & Animation Principles

> Good animations communicate state changes. Bad animations waste time.

### The 3 Rules:
1. **Duration**: Max 200ms for UI responses. Max 400ms for route transitions. Never longer.
2. **Easing**: `ease-out` for elements entering, `ease-in` for elements leaving.
3. **Purpose**: Every animation must communicate a state change — never cosmetic only.

### Specific Animations:

| Interaction | Animation | Duration | CSS |
|-------------|-----------|----------|-----|
| Sidebar collapse | Width slide | 300ms | `transition-all duration-300 ease-in-out` |
| POS card tap | Scale down then up | 150ms | `active:scale-95 transition-transform` |
| Kitchen late order | Border pulse | Infinite | `animate-pulse` (Tailwind) |
| Add to cart | Cart icon bounce | 200ms | Custom `@keyframes bounce-once` |
| Theme switch | Cross-fade colors | 0ms | `disableTransitionOnChange` (avoids FOUC) |
| Page title | Instant update | 0ms | No animation on text labels |
| Toast notifications | Slide in from bottom-right | 250ms | Shadcn Toaster default |
| Loading skeletons | Shimmer | Infinite | `animate-pulse` |

---

## Part 5 — Accessibility & RTL Completeness

### A11y Requirements:
- All interactive elements: minimum 44×44px touch target (WCAG 2.1 AA)
- Color contrast: minimum 4.5:1 for body text, 3:1 for UI components
- Focus rings: visible on all focusable elements (`--ring` variable)
- Screen readers: all icon-only buttons have `aria-label` in Arabic
- Keyboard navigation: Tab order follows visual RTL order

### RTL Completeness Checklist:
- [ ] `dir="rtl"` on `<html>` root
- [ ] Sidebar on **right** side, content expands **left**
- [ ] Chevron icons pointing **left** (→ collapse) **right** (→ expand) — mirrored from LTR
- [ ] Price display: `15,000 د.ع` — currency **after** number (Arabic convention)
- [ ] Date display: use `ar-IQ` locale via `Intl.DateTimeFormat`
- [ ] Table columns: right-aligned headers and data
- [ ] Toast notifications: appear from **bottom-right** (visual start of Arabic reading)
- [ ] Dropdown menus: `align="start"` (= right in RTL)

---

## Part 6 — Implementation Priority

### Wave 1 — Foundation (globals.css, layout.tsx, TheProvider)
*Impact: Immediate — everything inherits the new palette*

### Wave 2 — Navigation (GlobalSidebar, GlobalHeader, all layouts)
*Impact: All pages feel unified*

### Wave 3 — POS (cashier touch optimization)
*Impact: Cashiers work faster*

### Wave 4 — Kitchen (KDS dark mode, large cards, timer)
*Impact: Chefs make fewer mistakes*

### Wave 5 — Dashboard (unified charts, KPI cards)
*Impact: Managers have better insights*

---

## Appendix: Font Loading Strategy

```
// app/layout.tsx — Server Component
import { Inter, Tajawal } from 'next/font/google';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-arabic',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
});
```

CSS body default:
```css
body {
  font-family: var(--font-arabic), var(--font-latin), system-ui, sans-serif;
}
```
This ensures Arabic text uses Tajawal, while Latin numbers/labels fall through to Inter.

---

*End of Specification — `docs/specs/03-creative-ui-spec.md`*
*Next step: Review this creative direction, then update task-tracker.md and begin Wave 1 implementation.*
