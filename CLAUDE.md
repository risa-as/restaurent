# restaurant Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-15

## Active Technologies
- TypeScript 5.x + Next.js 14.2 (App Router), Prisma 5, NextAuth v5, shadcn/ui (Radix UI), Tailwind CSS, Pusher, Resend, next-pwa (004-saas-restaurant-upgrade)
- PostgreSQL 15+ — tenant isolation is enforced at the APPLICATION layer (Prisma client extension auto-injects `tenantId` + explicit `where: { tenantId }` filters). Database Row-Level Security is NOT enabled; see `src/lib/rls/README.md` for the (optional) defense-in-depth path. (004-saas-restaurant-upgrade)

- TypeScript 5.x / Next.js 14.2 (App Router) + Prisma 5 (PostgreSQL), NextAuth v5, shadcn/ui (Radix), Tailwind CSS, Lucide React (002-plan-enforcement-branches)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.x / Next.js 14.2 (App Router): Follow standard conventions

## Recent Changes
- 004-saas-restaurant-upgrade: Added TypeScript 5.x + Next.js 14.2 (App Router), Prisma 5, NextAuth v5, shadcn/ui (Radix UI), Tailwind CSS, Pusher, Resend, next-pwa

- 002-plan-enforcement-branches: Added TypeScript 5.x / Next.js 14.2 (App Router) + Prisma 5 (PostgreSQL), NextAuth v5, shadcn/ui (Radix), Tailwind CSS, Lucide React

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
