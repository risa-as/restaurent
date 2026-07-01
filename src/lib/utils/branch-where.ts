/**
 * Prisma `where` fragment that limits an operational query to ACTIVE branches
 * (plus legacy NULL-branch rows). Use when NO specific branch is selected, so a
 * DISABLED branch's data stays out of day-to-day/customer-facing views.
 *
 * Works for any model with an optional `branch` relation (Category, MenuItem,
 * Table, ...). Returns a fresh object each call so it is safe to spread/mutate.
 *
 * Do NOT use for historical/report queries — a disabled branch's past
 * orders/bills must remain visible in financial reports.
 */
export function activeBranchOr() {
    return { OR: [{ branch: { is: { isActive: true } } }, { branchId: null }] };
}
