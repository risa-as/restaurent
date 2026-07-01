# Tasks: SaaS Transformation — نظام إدارة المطعم

**Input**: `specs/master/` — plan.md, spec.md, data-model.md, contracts/api-contracts.md, research.md  
**Date**: 2026-03-09  

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تنفيذه بالتوازي (ملفات مختلفة)
- **[Story]**: قصة المستخدم المرتبطة [US1]...[US9]
- كل مهمة تحتوي المسار الكامل للملف

---

## Phase 1: Setup — البنية التحتية الأساسية

**Purpose**: إعداد المتطلبات الأساسية قبل أي تطوير

- [x] T001 تثبيت dependencies الجديدة: `npm install stripe resend @stripe/stripe-js` في `package.json`
- [x] T002 إضافة متغيرات البيئة في `env.example`: STRIPE_SECRET_KEY، STRIPE_WEBHOOK_SECRET، RESEND_API_KEY، NEXT_PUBLIC_ROOT_DOMAIN
- [x] T003 [P] إنشاء `src/lib/stripe.ts` — Stripe client singleton
- [x] T004 [P] إنشاء `src/lib/resend.ts` — Resend email client singleton
- [x] T005 [P] إنشاء `src/lib/tenant.ts` — دوال مساعدة للـ tenant context

---

## Phase 2: Foundational — Multi-Tenancy Core

**Purpose**: الأساس الذي تعتمد عليه كل القصص  
**⚠️ كريتيكال**: لا تبدأ أي User Story قبل إكمال هذه المرحلة

- [x] T006 تعديل `prisma/schema.prisma`: إضافة `model Tenant {}` مع جميع fields (name, slug, logoUrl, primaryColor, stripeCustomerId, plan, subscriptionStatus, trialEndsAt)
- [x] T007 تعديل `prisma/schema.prisma`: إضافة `enum PlanType { TRIAL BASIC PRO ENTERPRISE }` وenum `SubStatus { TRIAL ACTIVE PAST_DUE CANCELED PAUSED }`
- [x] T008 تعديل `prisma/schema.prisma`: إضافة `SUPER_ADMIN` لـ enum Role الموجود
- [x] T009 تعديل `prisma/schema.prisma`: إضافة `tenantId String?` لجداول: User, Category, MenuItem, Table, Order, Reservation, RawMaterial, Supplier — مع إضافة relation لـ Tenant
- [x] T010 إنشاء `prisma/migrations/` — تشغيل `npx prisma migrate dev --name add-multitenancy`
- [x] T011 إنشاء `prisma/seed-tenant.ts` — seed script ينشئ Tenant واحداً للبيانات الموجودة ويربط جميع الصفوف بـ tenantId
- [x] T012 تعديل `src/lib/prisma.ts`: إضافة Prisma $extends middleware يحقن `where: { tenantId }` تلقائياً في كل query بناءً على الـ context الحالي
- [x] T013 تعديل `src/lib/auth.ts`: إضافة `tenantId` و`tenantSlug` و`isSuperAdmin` للـ session/JWT token
- [x] T014 تعديل `src/middleware.ts`: قراءة subdomain من headers → lookup tenant في DB → inject `x-tenant-id` و`x-tenant-slug` في headers — redirect لـ `/suspended` لو `!tenant.isActive`

**Checkpoint**: ✅ الـ tenant isolation يعمل — موظف A لا يرى بيانات B — النظام الحالي يعمل بدون تغيير

---

## Phase 3: US1 — المطعم الجديد (Self-Onboarding) 🎯 MVP

**Goal**: مطعم جديد يسجل ويبدأ العمل خلال 5 دقائق  
**User Story**: كمالك مطعم، أريد التسجيل وإعداد مطعمي في خطوات بسيطة

**Independent Test**: سجّل حساب جديد من `/register` → أكمل الـ wizard → تحقق من إنشاء tenant في DB → تحقق من وصول إيميل الترحيب

### Implementation

- [x] T015 [P] [US1] إنشاء `src/app/(marketing)/page.tsx` — Landing page بسيطة مع زر "سجّل مطعمك"
- [x] T016 [P] [US1] إنشاء `src/app/register/page.tsx` — Wizard خطوة 1: بيانات المطعم (الاسم، slug، رفع شعار)
- [x] T017 [US1] إنشاء `src/app/register/owner/page.tsx` — Wizard خطوة 2: بيانات المالك (الاسم، إيميل، كلمة السر)
- [x] T018 [US1] إنشاء `src/app/register/plan/page.tsx` — Wizard خطوة 3: اختيار خطة (Basic/Pro/Enterprise)
- [x] T019 [P] [US1] إنشاء `src/app/api/tenants/register/route.ts` — `POST /api/tenants/register`: إنشاء Tenant + User (ADMIN) + إرسال إيميل ترحيب
- [x] T020 [US1] إنشاء `src/emails/welcome.tsx` — React Email template للإيميل الترحيبي بالعربية
- [x] T021 [P] [US1] إنشاء `src/components/onboarding/wizard-steps.tsx` — مكوّن الـ wizard مع progress indicator
- [x] T022 [US1] تعديل `src/app/api/tenants/register/route.ts`: التحقق من uniqueness الـ slug + validation كاملة

**Checkpoint**: ✅ مطعم جديد يمكنه التسجيل وتلقي إيميل ترحيب

---

## Phase 4: US2 — نظام الاشتراكات (Billing)

**Goal**: مطاعم تدفع اشتراكات شهرية عبر Stripe  
**User Story**: كمالك مطعم، أريد اختيار خطة اشتراك ودفعها بأمان

**Independent Test**: تسجيل → اختيار Pro plan → Stripe Checkout → webhook يُفعّل الاشتراك → status يصبح ACTIVE

### Implementation

- [x] T023 [P] [US2] إنشاء `src/app/api/stripe/create-checkout/route.ts` — إنشاء Stripe Checkout Session
- [x] T024 [P] [US2] إنشاء `src/app/api/stripe/create-portal/route.ts` — بوابة إدارة الاشتراك
- [x] T025 [US2] إنشاء `src/app/api/webhooks/stripe/route.ts` — معالجة: `checkout.session.completed` → ACTIVE، `invoice.payment_failed` → PAST_DUE، `customer.subscription.deleted` → CANCELED
- [x] T026 [P] [US2] إنشاء `src/emails/payment-failed.tsx` — إيميل تحذير فشل الدفع
- [x] T027 [P] [US2] إنشاء `src/emails/subscription-reminder.tsx` — إيميل قبل انتهاء الاشتراك بـ 3 أيام
- [x] T028 [US2] إنشاء `src/app/dashboard/billing/page.tsx` — صفحة الاشتراك للمطعم مع حالة الخطة الحالية وزر إدارة
- [x] T029 [US2] إضافة grace period logic في `src/middleware.ts`: PAST_DUE → تحذير مرئي فقط لـ 3 أيام، بعدها redirect لـ `/past-due`

**Checkpoint**: ✅ دورة الدفع الكاملة تعمل (Trial → ACTIVE → PAST_DUE → CANCELED)

---

## Phase 5: US3 — Super Admin Panel

**Goal**: أنت تتحكم في جميع المطاعم من مكان واحد  
**User Story**: كـ Super Admin، أريد مراقبة وإدارة جميع المطاعم المشتركة

**Independent Test**: login بـ SUPER_ADMIN role → `/superadmin` → رؤية قائمة المطاعم → إيقاف مطعم → تحقق من redirect المطعم الموقوف

### Implementation

- [x] T030 [P] [US3] إنشاء `src/app/superadmin/layout.tsx` — layout محمي بـ SUPER_ADMIN role فقط
- [x] T031 [P] [US3] إنشاء `src/app/superadmin/page.tsx` — Dashboard: إحصاءات (عدد المطاعم، الإيرادات، النشطة)
- [x] T032 [P] [US3] إنشاء `src/app/superadmin/tenants/page.tsx` — قائمة جميع المطاعم مع حالة الاشتراك
- [x] T033 [US3] إنشاء `src/app/api/superadmin/tenants/route.ts` — `GET` قائمة المطاعم
- [x] T034 [US3] إنشاء `src/app/api/superadmin/tenants/[id]/route.ts` — `PATCH` إيقاف/تفعيل مطعم
- [x] T035 [P] [US3] إنشاء `src/components/superadmin/tenant-card.tsx` — بطاقة مطعم مع controls
- [x] T036 [US3] إنشاء `src/app/superadmin/revenue/page.tsx` — تقرير الإيرادات (Pull من Stripe API)

**Checkpoint**: ✅ Super Admin يرى ويتحكم في جميع المطاعم

---

## Phase 6: US4 — White Labeling

**Goal**: كل مطعم يخصص مظهره الخاص  
**User Story**: كمالك مطعم، أريد وضع شعاري وألواني المميزة

**Independent Test**: غيّر primaryColor في dashboard → أعد تحميل الصفحة → تحقق من تطبيق اللون الجديد

### Implementation

- [x] T037 [P] [US4] تعديل `src/middleware.ts`: قراءة `primaryColor` و`logoUrl` من tenant DB ووضعهم في response headers
- [x] T038 [P] [US4] تعديل `src/app/layout.tsx`: قراءة headers وحقن CSS variables `--tenant-primary`، `--tenant-logo`
- [x] T039 [P] [US4] إنشاء `src/app/dashboard/settings/branding/page.tsx` — صفحة تخصيص الشعار والألوان
- [x] T040 [US4] إنشاء `src/app/api/tenant/settings/route.ts` — `GET` و`PATCH` إعدادات المطعم
- [x] T041 [US4] تعديل تطبيق الألوان في `src/app/globals.css`: استخدام `var(--tenant-primary)` بدلاً من الأرتقالي الثابت

**Checkpoint**: ✅ كل مطعم له مظهره الفريد

---

## Phase 7: US5 — QR Menu (طلب العميل الذاتي)

**Goal**: عميل يمسح QR ويطلب بدون تدخل النادل  
**User Story**: كعميل، أريد مسح QR code ورؤية القائمة وإرسال طلبي

**Independent Test**: افتح `/menu/test-restaurant` → تصفح القائمة → أرسل طلباً → تحقق من ظهوره في شاشة المطبخ

### Implementation

- [x] T042 [P] [US5] إنشاء `src/app/api/menu/[slug]/route.ts` — `GET` جلب الأقسام والمنتجات المتاحة للمطعم المختار (عبر slug)
- [x] T043 [US5] إنشاء `src/app/menu/[slug]/page.tsx` — واجهة المستخدم للـ QR Menu (تحمل ألوان المطعم وشعارها)
- [x] T044 [P] [US5] إنشاء `src/components/menu/customer-menu.tsx` — عرض الفئات والمنتجات بتصميم Card
- [x] T045 [P] [US5] إضافة ميزة السلة (Cart State) داخل `customer-menu.tsx` — إضافة، تقليل، إزالة
- [x] T046 [US5] إنشاء `src/app/api/menu/[slug]/order/route.ts` — `POST` إرسال الطلب من الزبون إلى المطبخ مباشرة
- [x] T047 [US5] دمج Pusher في `route.ts` لإرسال إشعار للمطبخ والكاشير بطلب جديد من الـ QR
- [x] T048 [US5] إنشاء صانع QR Code في `dashboard/settings/qr` مع زر طباعة للطاولات
- [x] T049 [US5] تعديل الـ kitchen realtime: إشعار المطبخ عند وصول طلب من QR Menu

**Checkpoint**: ✅ عميل يطلب بنفسه وطلبه يصل للمطبخ

---

## Phase 8: US6 — Loyalty System (نظام النقاط)

**Goal**: عملاء متكررون يحصلون على نقاط ومكافآت  
**User Story**: كعميل متكرر، أريد تجميع نقاط واستخدامها للحصول على خصومات

**Independent Test**: أكمل طلبين بنفس الرقم → تحقق من رصيد النقاط → استخدم النقاط في طلب كاشير → تحقق من الخصم

### Implementation

- [x] T048 [P] [US6] تعديل `prisma/schema.prisma`: إضافة `model Customer {}` (tenantId, phone, name, points, totalSpent)
- [x] T049 [US6] إنشاء `prisma/migrations/` — migration لجدول Customer
- [x] T050 [P] [US6] إنشاء `src/lib/actions/loyalty.ts` — server actions: `getCustomerByPhone`، `addPoints`، `redeemPoints`
- [x] T051 [US6] تعديل `src/lib/actions/cashier.ts`: عند إتمام الدفع، إضافة نقاط تلقائياً (1 نقطة / 1000 د.ع)
- [x] T052 [P] [US6] تعديل `src/components/cashier/cashier-cart.tsx`: إضافة حقل رقم العميل + عرض رصيد النقاط + خيار استخدامها
- [x] T053 [US6] إنشاء `src/app/dashboard/customers/page.tsx` — قائمة العملاء مع رصيد نقاطهم

**Checkpoint**: ✅ دورة الولاء الكاملة تعمل (طلب → نقاط → استخدام)

---

## Phase 9: US7 — AI Analytics (تحليلات الذكاء الاصطناعي)

**Goal**: المدير يفهم أداء مطعمه بتحليلات ذكية  
**User Story**: كمدير مطعم، أريد تقارير ذكية تخبرني بأفضل الأصناف وتوقعات المبيعات

**Independent Test**: افتح `/dashboard/analytics` → اطلب تقرير → تحقق من ظهور insights مفيدة خلال < 10 ثوانٍ

### Implementation

- [x] T054 [P] [US7] إنشاء `src/app/dashboard/analytics/page.tsx` — صفحة التحليلات مع charts + AI insights
- [x] T055 [P] [US7] إنشاء `src/app/api/analytics/insights/route.ts` — يجمع aggregate data → يرسل لـ OpenAI → يعيد insights
- [x] T056 [US7] إنشاء `src/components/analytics/ai-insights-card.tsx` — مكوّن عرض الـ insights مع streaming
- [x] T057 [P] [US7] إنشاء `src/lib/analytics.ts` — دوال تجميع البيانات: `getTopItems`، `getMonthlySales`، `getPeakHours`

**Checkpoint**: ✅ AI insights تعمل وتعطي توصيات مفيدة

---

## Phase 10: US8 — OpenStreetMap Integration

**Goal**: تحديد عنوان التوصيل بدقة على الخريطة مجاناً  
**User Story**: كسائق وعميل، أريد تحديد الموقع بدقة بدلاً من إدخال العنوان يدوياً

**Independent Test**: افتح نموذج طلب توصيل → اختر الموقع على الخريطة → تحقق من ظهور الإحداثيات

### Implementation

- [x] T058 [P] [US8] إنشاء `src/components/maps/leaflet-map.tsx` — مكوّن خريطة تفاعلي باستخدام `react-leaflet` و `leaflet`
- [x] T059 [US8] تعديل `src/components/delivery/delivery-dashboard.tsx` أو صفحة الدليفري: إضافة خريطة يمكن للعميل من خلالها اختيار موقعه بدقة
- [x] T060 [US8] تعديل `prisma/schema.prisma`: إضافة `lat Float?` و`lng Float?` لجدول OrderItems/Order (أو جدول مخصص للتوصيل إذا لزم) لدعم خط العرض والطول
- [x] T061 [US8] إنشاء `src/components/delivery/driver-map-modal.tsx`: عرض موقع العميل والسائق المحتمل على نفس الخريطة

**Checkpoint**: ✅ التوصيل يعتمد على إحداثيات دقيقة من OpenStreetMap

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: تحسينات تشمل جميع القصص، أمان وتوثيق

- [x] T063 [P] مراجعة جميع routes وإضافة rate limiting في `src/middleware.ts`
- [x] T064 [P] إضافة error boundary pages: `src/app/suspended/page.tsx`، `src/app/trial-expired/page.tsx`، `src/app/past-due/page.tsx`
- [x] T065 [P] تحديث `specs/master/quickstart.md` بخطوات تشغيل النظام الكامل
- [x] T066 توثيق `specs/master/data-model.md` بالـ indexes الفعلية المُضافة
- [x] T067 [P] إنشاء `src/app/dashboard/settings/team/page.tsx` — إدارة الموظفين + دعوة أعضاء جدد
- [x] T068 Performance: إضافة `@@index([tenantId])` على كل جداول prisma schema
- [x] T069 Security: التحقق من أن جميع server actions تتحقق من tenantId صحيح قبل أي mutation

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational — BLOCKER)
    ↓
Phase 3 (US1 - Onboarding) ─── يُفعّل الـ tenants
    ↓
Phase 4 (US2 - Billing) ─────── يعتمد على US1 (tenant موجود)
    ↓ (يمكن التوازي بين 5-10)
Phase 5  (US3 - Super Admin)
Phase 6  (US4 - White Label)
Phase 7  (US5 - QR Menu)
Phase 8  (US6 - Loyalty)
Phase 9  (US7 - AI Analytics)
Phase 10 (US8 - OpenStreetMap)
    ↓
Phase 11 (Polish)
```

### User Story Dependencies

| User Story | يعتمد على | مستقل بعد |
|------------|-----------|-----------|
| US1 (Onboarding) | Phase 2 فقط | T014 ✅ |
| US2 (Billing) | US1 (tenant يجب أن يُنشأ أولاً) | T022 ✅ |
| US3 (Super Admin) | Phase 2 + SUPER_ADMIN role | T014 ✅ |
| US4 (White Label) | Phase 2 | T014 ✅ |
| US5 (QR Menu) | Phase 2 | T014 ✅ |
| US6 (Loyalty) | Phase 2 | T048 ✅ |
| US7 (AI Analytics) | Phase 2 | T014 ✅ |
| US8 (Google Maps) | Phase 2 | T058 ✅ |

---

## Parallel Example: Phase 2 (Foundational)

```text
يمكن تنفيذ هذه المهام بالتوازي:
- T003 إنشاء src/lib/stripe.ts
- T004 إنشاء src/lib/resend.ts
- T005 إنشاء src/lib/tenant.ts

يجب أن تنتهي T006-T011 أولاً قبل:
- T012 (Prisma middleware) ← يعتمد على schema
- T013 (Auth changes) ← يعتمد على schema
- T014 (Next.js middleware) ← يعتمد على tenant في DB
```

---

## Implementation Strategy

### MVP (الحد الأدنى للإطلاق)

```
Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (Onboarding) + Phase 4 (Billing)
= نظام SaaS قابل للاستخدام التجاري
```

**التحقق من MVP**:
1. سجّل مطعماً جديداً من `/register`
2. تحقق من وصول إيميل الترحيب
3. ادفع اشتراكاً عبر Stripe (test mode)
4. تحقق من تفعيل الحساب تلقائياً
5. افتح النظام تحت subdomain المطعم

### Incremental Delivery

```
MVP (Phase 1-4)     → أول مطعم يدفع 💰
+ Phase 5           → تتحكم في جميع المطاعم
+ Phase 6           → كل مطعم بهويته البصرية
+ Phase 7 (QR)      → ميزة تنافسية كبيرة
+ Phase 8 (Loyalty) → زيادة retention
+ Phase 9 (AI)      → premium plan justification
+ Phase 10 (Maps)   → توصيل احترافي
```

---

## Summary

| الإجمالي | العدد |
|---------|-------|
| إجمالي المهام | 69 مهمة |
| مهام Setup | 5 (T001-T005) |
| مهام Foundational | 9 (T006-T014) |
| مهام User Stories | 51 (T015-T062) |
| مهام Polish | 7 (T063-T069) |
| مهام قابلة للتوازي [P] | ~35 مهمة |
| User Stories | 8 قصص |
| MVP scope | Phase 1-4 (22 مهمة) |
