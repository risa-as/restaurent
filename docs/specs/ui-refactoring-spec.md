# Phase 5: UI/UX Refactoring & Centralized Design System

> **Status**: Planning
> **Stack**: Next.js 14 · Tailwind CSS · Shadcn/UI · Recharts · next-themes
> **Goal**: Transform the system into a visually premium, cohesive, and role-optimized restaurant management platform.

---

## 🔍 Current State Analysis

| Area | Problem |
|------|---------|
| **Colors** | Default black/white Shadcn theme — no brand identity |
| **Dark Mode** | `.dark` class in CSS exists but no theme switcher connected |
| **Layouts** | 9 separate layouts with duplicated, inconsistent headers |
| **Hardcoded values** | `bg-gray-100`, `bg-gray-50` scattered vs CSS variables |
| **POS screen** | Small buttons, not touch-optimized |
| **Kitchen display** | Standard text sizes — not readable from a distance |
| **Charts** | Hardcoded Recharts colors, don't respect theme |

---

## 🎨 5.1 — Centralized Design Token System (`globals.css`)

### Brand Color: Warm Restaurant Amber-Orange
The restaurant brand uses a warm amber-orange as the primary color — communicating energy, warmth, and hospitality.

```css
/* Light Mode */
--primary: 24 94% 50%;          /* #f97316 — Vibrant orange */
--primary-foreground: 0 0% 100%;

--secondary: 30 30% 95%;        /* Warm ivory */
--secondary-foreground: 24 40% 20%;

--accent: 43 90% 55%;           /* Golden yellow — for highlights */
--accent-foreground: 0 0% 10%;

--background: 30 15% 98%;       /* Off-white warm */
--foreground: 20 15% 12%;       /* Warm near-black */

--card: 0 0% 100%;
--muted: 30 20% 94%;
--muted-foreground: 30 10% 45%;

--border: 30 15% 88%;
--ring: 24 94% 50%;             /* Focus ring matches primary */

/* Semantic Extras (Kitchen status colors) */
--status-pending: 43 96% 56%;   /* Yellow */
--status-preparing: 217 91% 60%; /* Blue */
--status-ready: 142 71% 45%;   /* Green */
--status-late: 0 84% 60%;       /* Red */

/* Chart palette (respects brand) */
--chart-1: 24 94% 50%;   /* Primary orange */
--chart-2: 142 71% 45%;  /* Success green */
--chart-3: 217 91% 60%;  /* Information blue */
--chart-4: 43 96% 56%;   /* Warning yellow */
--chart-5: 280 65% 60%;  /* Purple — 5th series */

/* Dark Mode counterparts — all same hue, adjusted lightness */
```

### Typography
- **Font**: `Inter` (latin) + `Noto Kufi Arabic` (arabic) — loaded via `next/font/google`
- **Base size**: 15px for admin views, 18px for role-specific displays
- **Arabic RTL**: `dir="rtl"` set at root, reversed flex/grid layouts

---

## 🏗️ 5.2 — Standardized Layout Architecture

### Component Hierarchy

```
app/layout.tsx (root)
└── ThemeProvider (next-themes)
    ├── app/dashboard/layout.tsx
    │   ├── GlobalSidebar (collapsible, role-aware)
    │   └── DashboardShell
    │       ├── GlobalHeader (page title + user menu + theme toggle)
    │       └── <main> {children}
    ├── app/kitchen/layout.tsx
    │   └── KitchenShell (fullscreen, high-visibility)
    ├── app/cashier/layout.tsx  
    │   └── POSShell (touch-optimized)
    └── app/*/layout.tsx
        └── RoleShell (minimal header)
```

### New Components to Create

#### `GlobalSidebar` (`src/components/layout/global-sidebar.tsx`)
- **Collapsible**: icon-only mode (48px) ↔ expanded (240px) with transition
- **Role-aware links**: each nav item declares `allowedRoles[]` — hidden if user lacks role
- **Active state**: uses `usePathname()` for precise highlighting
- **Brand at top**: restaurant name/logo + collapse toggle
- **User info at bottom**: avatar + name + role badge + sign out

#### `GlobalHeader` (`src/components/layout/global-header.tsx`)
- **Dynamic page title**: uses `usePathname` + a path→title map
- **Theme toggle**: sun/moon/system dropdown (next-themes)
- **User dropdown**: profile, settings, sign out
- **Notification area**: reserved for future alerts (low stock, etc.)

#### `ThemeProvider` (`src/components/providers/theme-provider.tsx`)
- Wraps `next-themes` `ThemeProvider`
- Props: `attribute="class"`, `defaultTheme="system"`, `enableSystem`

#### `ThemeToggle` (`src/components/layout/theme-toggle.tsx`)
- Dropdown with Light/Dark/System options
- Icons: Sun / Moon / Monitor from lucide-react

---

## 🌙 5.3 — Dark Mode (`next-themes`)

### Installation
```powershell
npm install next-themes
```

### Implementation Steps
1. Wrap `app/layout.tsx` root with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
2. All color references via CSS vars (already using Shadcn vars — just need theme toggle wired up)
3. Kitchen display dark mode: deep `#0a0a0a` background with colored status cards for max contrast
4. POS dark mode: dark navy with bright buttons for readability under harsh restaurant lighting

---

## 📱 5.4 — Role-Specific UX Enhancements

### POS (Cashier / Captain) — Touch-Optimized

**Problems**: Small click targets, cluttered layout, multiple tabs to reach checkout
**Solutions**:
- Grid of menu items: min 120×120px tappable cards, larger on tablet
- Category filter: large pill buttons (height: 48px min)
- Order summary: fixed right panel on ≥lg screens, bottom drawer on mobile
- Single-tap item addition — no confirmation dialogs
- "Charge" button: full-width, 64px height, primary color, with total displayed
- Keyboard shortcut support for desktop cashiers (Enter = confirm, Escape = cancel)

**Layout**:
```
[Category Tabs — horizontal scroll]
[Menu Grid]                │ [Order Summary Panel]
  🍕 Pizza (120×120px)    │  Item x2 — 10,000 IQD
  🍔 Burger               │  Item x1 — 5,000 IQD
  ...                     │  ─────────────────
                          │  TOTAL: 15,000 IQD
                          │  [💳 CHARGE →]
```

### Kitchen Display — High Visibility

**Problems**: Standard text, no urgency gradients, hard to see from 2m away
**Solutions**:
- Order cards: large (min-height: 200px), with giant order number (#47) at top
- Status ring border: 4px solid color-coded border (pending=yellow, preparing=blue, ready=green, late=red pulsing)
- Item text: 18px minimum, bold
- Time elapsed: counter in top-right — turns amber at 10 min, red at 15 min with pulse animation
- Sound alert: browser `AudioContext` beep on new order arrival
- Auto-refresh every 30s or via `router.refresh()`

### Finance / Admin — Unified Charts

**Solutions**:
- Recharts `<BarChart>`, `<LineChart>`, etc. use `var(--chart-1)` through `var(--chart-5)`
- Helper: `useChartColors()` hook that reads CSS vars and returns hex values for Recharts
- Consistent chart wrapper card: title + date range badge + chart
- Dark mode: chart grid lines use `var(--border)`, labels use `var(--muted-foreground)`

---

## ✅ 5.5 — Verification Plan

### Automated
- `npm run build` — must pass with 0 errors after each phase task

### Visual Verification (Manual — run `npm run dev`)
1. **Theme toggle**: Switch Light→Dark→System on `/dashboard` — all colors must update
2. **Primary color**: Change `--primary` HSL value in globals.css → verify all buttons/headers update
3. **Sidebar collapse**: Click toggle → sidebar collapses to icon-only, content area expands
4. **Role-based nav**: Login as CASHIER → verify sidebar shows only cashier-appropriate links
5. **Kitchen display**: Open `/kitchen` → cards visible from 1m away, time counter ticks
6. **POS touch**: Open `/cashier` → tap items, verify large targets, complete a mock order
7. **Arabic RTL**: Verify all layouts render correctly right-to-left
8. **Dark mode charts**: Switch to dark — chart colors remain vibrant, grid/axes readable
