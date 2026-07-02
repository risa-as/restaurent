import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export interface ApiUser {
  role: string;
  tenantId?: string;
  userId?: string;
}

/**
 * Session + role allowlist guard for API route handlers (least privilege —
 * previously any authenticated tenant user could read any page's data
 * endpoint, e.g. a waiter reading the cashier's shift totals).
 *
 * Returns either `{ user }` or `{ response }` ready to be returned.
 */
export async function requireApiRole(
  allowedRoles: string[],
): Promise<{ user: ApiUser; response?: never } | { user?: never; response: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) };
  }

  const role = (session.user as { role?: string }).role;
  if (!role || !allowedRoles.includes(role)) {
    return { response: NextResponse.json({ error: 'دورك لا يملك صلاحية الوصول لهذه البيانات' }, { status: 403 }) };
  }

  return {
    user: {
      role,
      tenantId: (session.user as { tenantId?: string }).tenantId,
      userId: (session.user as { id?: string }).id,
    },
  };
}
