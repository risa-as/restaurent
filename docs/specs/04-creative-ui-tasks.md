# 📋 Tasks: Creative UI Redesign — "Night Market"

> **Source Spec**: [03-creative-ui-spec.md](./03-creative-ui-spec.md)
> **Stack**: Next.js 14 · Tailwind CSS · Shadcn/UI · Recharts · next-themes · Tajawal Font
> **Last Updated**: 2026-03-03
> **Safety Rule**: ⛔ Do NOT touch `src/lib/actions/` or `prisma/schema.prisma`

---

## Wave 1 — Foundation (Design Tokens & Fonts)
*Impact: Every component inherits the new palette instantly*

- [x] **W1-T1** Update `globals.css` — Deep Indigo primary, Saffron Gold accent, Cool off-white bg
- [x] **W1-T2** Update `globals.css` `.dark` — Deep Navy background, brighter indigo, vivid gold
- [x] **W1-T3** Add layout tokens: `--sidebar-width`, `--header-height`, `--pos-card-size`, `--pos-button-height`
- [x] **W1-T4** Add kitchen status tokens: `--status-pending/preparing/ready/late`
- [x] **W1-T5** Add chart tokens: `--chart-1..5` (indigo, green, cyan, gold, purple)
- [x] **W1-T6** Update `app/layout.tsx` — switch from `Noto_Kufi_Arabic` → `Tajawal`, keep `Inter`
- [x] **W1-T7** ✅ **USER**: `npm run build` — Wave 1 passed (35/35 pages)

---

## Wave 2 — Navigation (GlobalSidebar & GlobalHeader)
*Impact: Unified look across all dashboard pages*

- [x] **W2-T1** Updated `global-sidebar.tsx` — 240/60px widths, Indigo active, RTL border-l
- [x] **W2-T2** Updated `global-sidebar.tsx` — localStorage collapse persistence
- [x] **W2-T3** Updated `global-sidebar.tsx` — brand logo: rounded-xl Indigo icon
- [x] **W2-T4** Updated `global-header.tsx` — Saffron Gold role badge (border-accent/30)
- [x] **W2-T5** Updated `page-title.tsx` — RTL aligned
- [x] **W2-T6** Updated `role-header.tsx` — RTL flex, bg-card border-b
- [x] **W2-T7** Updated `dashboard/layout.tsx` — bg-background, min-w-0, Toaster placement
- [ ] **W2-T8** ⏸️ **USER**: Run `npm run build` — verify Wave 2 compiles

---

## Wave 3 — POS Velocity Interface
*Impact: Cashiers work faster, zero cognitive load*

- [x] **W3-T1** Updated `pos-interface.tsx` — category tabs: h-12, Indigo active pill
- [x] **W3-T2** Updated `pos-interface.tsx` — menu card: 130px image, hover shadow-primary/10
- [x] **W3-T3** Updated `pos-interface.tsx` — no-image fallback: 🍽️ emoji
- [x] **W3-T4** Updated `pos-interface.tsx` — offer badge: rounded-full destructive
- [x] **W3-T5** Updated `cart-sidebar.tsx` — charge button: Gold (bg-accent), h-16
- [x] **W3-T6** Updated `cart-sidebar.tsx` — quantity controls: 32px buttons, font-bold
- [x] **W3-T7** Updated `cart-sidebar.tsx` — empty cart: 🛒 emoji + Arabic prompt
- [x] **W3-T8** Updated `cart-sidebar.tsx` — order total: prominent 2xl display
- [ ] **W3-T9** ⏸️ **USER**: Run `npm run build` — verify Wave 3 compiles

---

## Wave 4 — Kitchen Display System (Forced Dark Mode)
*Impact: Chef readability from 3 meters, urgency at a glance*

- [x] **W4-T1** Updated `kitchen/layout.tsx` — `dark` class + `data-force-dark`, Indigo filled icon, max-w-1600px
- [x] **W4-T2** Updated `kitchen-ticket.tsx` — order number: `text-5xl font-black`
- [x] **W4-T3** Updated `kitchen-ticket.tsx` — card border: `border-4` status-colored (CSS vars)
- [x] **W4-T4** Updated `kitchen-ticket.tsx` — item text: `text-[17px] font-bold`
- [x] **W4-T5** Updated `kitchen-ticket.tsx` — quantity: `40×40px` (w-10 h-10) Indigo pill
- [x] **W4-T6** Updated `kitchen-ticket.tsx` — action buttons: h-14, Gold finish, Indigo start
- [x] **W4-T7** Updated `kitchen-ticket.tsx` — elapsed: 2xl font-black, ⚡ badge at 15m
- [x] **W4-T8** Verified timer: `setInterval` 30s already present
- [x] **W4-T9** Card min-h: `min-h-[220px]` — confirmed in existing code
- [ ] **W4-T10** ⏸️ **USER**: Run `npm run build` — verify Wave 4 compiles

---

## Wave 5 — Dashboard KPI Cards & Charts
*Impact: Managers get premium enterprise-grade analytics*

- [x] **W5-T1** Updated `use-chart-colors.ts` — Indigo SSR fallbacks, tooltip object, per-color fallbacks
- [x] **W5-T2** Updated `revenue-chart.tsx` — AreaChart, 20% Indigo gradient fill, Arabic RTL tooltip
- [x] **W5-T3** Updated `category-chart.tsx` — innerRadius=80 outerRadius=110, strokeWidth=0, RTL legend
- [x] **W5-T4** Updated `dashboard/page.tsx` KPI cards — 3xl font-black, rounded-xl icon bg, dynamic alert colors
- [x] **W5-T5** Finance charts reviewed — consistent tooltip style + RTL direction applied
- [x] **W5-T6** ✅ `npm run build` — Wave 5 passed (35/35 pages, /accountant/reports: 335kB)

---

## Wave 6 — RTL Completeness & A11y Polish
*Impact: Flawless Arabic experience, WCAG compliance*

- [x] **W6-T1** RTL audit: layout files clean — no directional class violations found
- [x] **W6-T2** GlobalSidebar chevrons: RTL correct (`ChevronRight` = expand, `ChevronLeft` = collapse)
- [x] **W6-T3** Dropdowns: `align="start"` fixed in `global-header.tsx` + `theme-toggle.tsx`
- [x] **W6-T4** Icon-only buttons: `aria-label` added to Bell, ThemeToggle, sidebar collapse toggle
- [x] **W6-T5** Price format: `.toLocaleString('ar-IQ')` + "د.ع" suffix pattern applied in KPI cards
- [ ] **W6-T6** ⏸️ **USER**: Manual RTL audit on `/dashboard`, `/cashier`, `/kitchen`
- [x] **W6-T7** ✅ Final `npm run build` — **35/35 pages** passing, 0 errors, 0 type errors

---

## Summary Table

| Wave | Tasks | Focus | Build Gate |
|------|-------|-------|-----------|
| Wave 1 | 7 | Tokens + Fonts | ✅ After W1-T6 |
| Wave 2 | 8 | Navigation | After W2-T7 |
| Wave 3 | 9 | POS Touch | After W3-T8 |
| Wave 4 | 10 | Kitchen KDS | After W4-T9 |
| Wave 5 | 6 | Charts + KPIs | After W5-T5 |
| Wave 6 | 7 | RTL + A11y | Final verify |
| **Total** | **47** | | |
