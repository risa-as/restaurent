# Implementation Plan: SaaS Transformation

**Branch**: `master` | **Date**: 2026-03-09  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

---

## Summary

تحويل نظام إدارة المطعم الأحادي إلى منصة SaaS متعددة المستأجرين (Multi-tenant) باستخدام Row-Level Tenancy على قاعدة PostgreSQL الحالية + Stripe للمدفوعات + Resend للإيميلات + Subdomain routing عبر Next.js middleware.

---

## Technical Context

**Language/Version**: TypeScript 5 + Next.js 14 (App Router)  
**Primary Dependencies**: Prisma ORM، NextAuth، Stripe SDK، Resend، Vercel AI SDK  
**Storage**: PostgreSQL (نفس قاعدة البيانات الحالية + migrations تدريجية)  
**Testing**: Manual E2E + Stripe CLI webhooks  
**Target Platform**: Vercel (wildcard subdomains)  
**Project Type**: Web SaaS application  
**Performance Goals**: < 200ms TTFB للصفحات الرئيسية، < 500ms للـ API  
**Constraints**: لا يتأثر النظام الحالي أثناء migration (zero downtime)  
**Scale/Scope**: مرحلة أولى: 10-50 مطعم، قابل للتوسع لـ 1000+

---

## Constitution Check

> لا يوجد constitution محدد بعد للمشروع — يُنشأ لاحقاً.

**Gates**:
- ✅ لا تغيير على الـ framework الحالي
- ✅ migration تدريجية — لا data loss
- ✅ backward compatible — النظام يعمل أثناء التطوير
- ⚠️ يُضاف SuperAdmin role جديد — لا يتعارض مع roles الحالية

---

## Project Structure

### Documentation (this feature)

```text
specs/master/
├── spec.md              ✅ Feature specification
├── plan.md              ✅ This file
├── research.md          ✅ Phase 0 research
├── data-model.md        ✅ Phase 1 data model
├── quickstart.md        ✅ Developer guide
├── contracts/
│   └── api-contracts.md ✅ API contracts
└── tasks.md             ⏳ Phase 2 (/speckit.tasks command)
```

### Source Code Changes

```text
prisma/
└── schema.prisma         ← إضافة Tenant, Customer, tenantId fields

src/
├── middleware.ts          ← Subdomain routing (جديد/تعديل)
├── lib/
│   ├── tenant.ts          ← [NEW] tenant context helpers
│   ├── stripe.ts          ← [NEW] Stripe client
│   ├── resend.ts          ← [NEW] Email client
│   └── prisma.ts          ← إضافة tenant middleware
├── app/
│   ├── (marketing)/       ← [NEW] Landing page
│   ├── register/          ← [NEW] Onboarding wizard
│   ├── menu/[slug]/       ← [NEW] Public QR menu
│   ├── superadmin/        ← [NEW] Super Admin panel
│   ├── api/
│   │   ├── tenants/       ← [NEW] Tenant registration
│   │   ├── stripe/        ← [NEW] Stripe checkout/portal
│   │   └── webhooks/      ← [NEW] Stripe webhooks
│   └── (app)/             ← النظام الحالي (لا تغيير واجهي)
└── components/
    ├── onboarding/        ← [NEW] Wizard steps
    └── superadmin/        ← [NEW] Admin components
```

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected |
|------|-----------|------------------------------|
| Row-Level Tenancy | البيانات في نفس DB، Prisma تدعمها بـ middleware | Schema-per-tenant: معقد جداً مع Prisma migrations |
| Stripe Webhooks | ضمان تزامن حالة الاشتراك مع الدفع الفعلي | Polling: غير موثوق، يفوت أحداث |
| Next.js Middleware للـ subdomains | الطريقة الرسمية لـ Vercel wildcard | Domain params: يكسر الـ UX |

---

## Implementation Phases

### Phase 1 — Multi-Tenancy (الأساس)
**الهدف**: كل tenant معزول، النظام الحالي يعمل بدون تغيير  

1. تعديل `prisma/schema.prisma`:
   - إضافة `model Tenant {}`
   - إضافة `model Customer {}`
   - إضافة `tenantId String?` لجميع الجداول
   - إضافة `SUPER_ADMIN` للـ Role enum
   
2. تشغيل migrations + seed script للبيانات الحالية

3. تعديل `lib/prisma.ts`:
   - إضافة Prisma middleware يحقن `where: { tenantId }` تلقائياً
   
4. تعديل `lib/auth.ts`:
   - إضافة `tenantId` + `tenantSlug` للـ session
   
5. تعديل `middleware.ts`:
   - قراءة subdomain → lookup tenantId → inject headers
   - حماية routes الجديدة

---

### Phase 2 — Onboarding + Billing
**الهدف**: مطعم جديد يسجل ويبدأ خلال 5 دقائق  

1. صفحة `/register` (Wizard 3 خطوات):
   - خطوة 1: بيانات المطعم (الاسم، slug، الشعار)
   - خطوة 2: بيانات المالك (الاسم، إيميل، كلمة السر)
   - خطوة 3: اختيار خطة → Stripe Checkout
   
2. Stripe integration:
   - `POST /api/stripe/create-checkout`
   - `POST /api/webhooks/stripe` (معالجة الأحداث)
   
3. Resend emails:
   - ترحيب + بيانات دخول
   - فاتورة شهرية
   - تحذير انتهاء الاشتراك

---

### Phase 3 — Super Admin Panel
**الهدف**: أنت تتحكم في جميع المطاعم  

1. Route `/superadmin` محمي بـ SUPER_ADMIN
2. لوحة المطاعم: قائمة + إحصاءات
3. إيقاف/تفعيل مطعم
4. عرض الإيرادات الشهرية (من Stripe)

---

### Phase 4 — القيمة المضافة
**الهدف**: ميزات تنافسية تُبرر الاشتراك  

1. **QR Menu**: `/menu/[slug]` صفحة عامة
2. **White Labeling**: CSS variables per tenant
3. **Loyalty System**: Customer model + points
4. **Google Maps**: في صفحة التوصيل
5. **AI Analytics**: تقارير مبيعات بـ GPT-4o-mini

---

## Verification Plan

### Automated
```bash
# Stripe webhooks testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
# Expected: Tenant.subscriptionStatus → ACTIVE

stripe trigger invoice.payment_failed
# Expected: Tenant.subscriptionStatus → PAST_DUE + email sent
```

### Manual Tests
1. **Tenant Isolation**: سجّل مطعمين مختلفين → تأكد أن موظف A لا يرى طلبات B
2. **Subdomain Routing**: افتح `restaurant-a.localhost:3000` و `restaurant-b.localhost:3000`
3. **Onboarding**: أكمل الـ wizard من البداية حتى أول طلب
4. **Super Admin**: افتح `/superadmin` → جرب إيقاف مطعم → تحقق من الـ redirect
5. **QR Menu**: امسح QR → اطلب → تأكد وصول الطلب للمطبخ

---

## Next Step

```bash
# لإنشاء قائمة المهام التفصيلية:
specify run speckit.tasks
```
