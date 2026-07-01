# 🎯 Active Task

## Current: T-5.1 → T-5.5 — Design Tokens (globals.css)

**Phase**: 5A — Design Token System

---

### What to do:
Replace the default black/white Shadcn color palette with a warm restaurant brand palette using HSL CSS variables. This is the foundation of the entire Phase 5 — every other task depends on getting the tokens right first.

### Files to modify:
- `src/app/globals.css` — Replace all `:root` and `.dark` HSL values
- `src/app/layout.tsx` — Add Google Fonts (Inter + Noto Kufi Arabic)

### New brand color decisions:
| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--primary` | `24 94% 50%` (orange) | `24 90% 55%` | Buttons, active states, links |
| `--accent` | `43 90% 55%` (gold) | `43 85% 50%` | Highlights, badges |
| `--background` | `30 15% 98%` (warm white) | `20 14% 7%` | Page bg |
| `--status-ready` | `142 71% 45%` | `142 60% 50%` | Kitchen: ready |
| `--status-late` | `0 84% 60%` | `0 75% 55%` | Kitchen: overdue |

### After finishing:
Run `npm run dev` and verify:
- Primary buttons are now orange (e.g. on `/dashboard/menu`)
- Dark mode toggle (to be added in T-5.7) would switch colors correctly

---

Are you ready to begin Phase 5? 🚀
