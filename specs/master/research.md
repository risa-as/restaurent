# Research: SaaS Transformation

**Phase**: 0 — Unknowns Resolution  
**Date**: 2026-03-09  

---

## 1. Multi-Tenancy Strategy

### Decision: Row-Level Tenancy (Single Database)
**Rationale**: أبسط وأسرع للتنفيذ على قاعدة Prisma الحالية. كل جدول يضاف له `tenantId`. الـ middleware يضمن عزل الاستعلامات تلقائياً.

**Alternatives Considered**:
- **Schema-per-tenant** (PostgreSQL schemas): أقوى عزلاً لكن معقد مع Prisma migrations
- **Database-per-tenant**: الأفضل للعزل لكن تكلفة تشغيل عالية جداً للـ MVP

**Implementation**:
```
- إضافة model Tenant {} في prisma schema
- إضافة tenantId: String إلى كل جدول بيانات
- Prisma Middleware يحقن tenantId تلقائياً في كل query
- NextAuth session تحتوي tenantId + role
```

---

## 2. Subdomain Routing

### Decision: Next.js Middleware + Vercel Wildcard Domains
**Rationale**: Vercel تدعم wildcard subdomains مدمجة. Next.js middleware يقرأ hostname ويحدد tenantId.

**Pattern**:
```
*.risa-sys.com → Vercel project
middleware.ts: reads req.headers.host → extracts slug → looks up tenantId in DB
```

**Dev Environment**: استخدام `tenant.localhost:3000` مع hosts file

---

## 3. Subscription & Billing

### Decision: Stripe Checkout + Customer Portal
**Rationale**: Stripe هو الأكثر موثوقية وموثوق دولياً. Paddle بديل لكن Stripe أوسع انتشاراً في المنطقة.

**Plans**:
| Plan | Price | Features |
|------|-------|---------|
| Basic | $29/mo | 1 فرع، 10 موظفين، كاشير + مطبخ |
| Pro | $79/mo | 3 فروع، موظفين غير محدودين، + توصيل |
| Enterprise | $199/mo | فروع غير محدودة، White Label، AI Analytics |

**Webhooks to handle**:
- `checkout.session.completed` → تفعيل الاشتراك
- `invoice.payment_failed` → إشعار + grace period 3 أيام
- `customer.subscription.deleted` → تجميد الحساب

---

## 4. Email Provider

### Decision: Resend
**Rationale**: أبسط API، مجاني حتى 3000 إيميل/شهر، يدعم React Email templates.

**Emails needed**:
- Welcome + بيانات الدخول (عربي)
- دعوة موظف
- فاتورة شهرية
- تحذير انتهاء الاشتراك

---

## 5. QR Menu

### Decision: Static QR per Table → Public Page
**Rationale**: كل طاولة لها QR يحتوي URL بالشكل `/menu/{tenantSlug}?table={tableId}`. صفحة عامة بدون login.

**Pattern**:
```
/menu/[slug]/page.tsx  → public menu page
/menu/[slug]/order     → submit order action
```

---

## 6. AI Analytics

### Decision: Vercel AI SDK + OpenAI GPT-4o-mini
**Rationale**: حجم البيانات صغير للـ MVP، GPT-4o-mini اقتصادي، يمكن إرسال aggregate data وليس raw rows.

**Features**:
- تحليل أفضل 10 أصناف مبيعاً هذا الشهر
- اقتراح رفع/تخفيض أسعار بناءً على المبيعات
- توقع الطلب للأسبوع القادم

---

## 7. Google Maps Integration

### Decision: Google Maps JavaScript API + Places API
**Rationale**: الأدق في العراق والمنطقة. يستبدل الإدخال اليدوي للعنوان في صفحة التوصيل.

**Usage**:
- autocomplete لحقل العنوان في طلب التوصيل
- عرض موقع السائق والعميل على خريطة واحدة
- حساب المسافة التقديرية

---

## 8. White Labeling

### Decision: CSS Variables per Tenant في DB
**Rationale**: تخزين `primaryColor`, `logoUrl`, `appName` في جدول `Tenant`. Middleware يحقنها كـ CSS variables.

```
--tenant-primary: #f97316;
--tenant-bg: #0f172a;
```

---

## 9. Loyalty System

### Decision: Points per Order (Simple)
**Pattern**: 
- 1 نقطة لكل 1000 د.ع
- تخزين في جدول `Customer` مرتبط بـ phone number
- استبدال عند الدفع (كاشير يختار رصيد النقاط)

---

## Open Questions (RESOLVED)

| Question | Resolution |
|----------|-----------|
| هل نغير DB schema الحالية؟ | نعم، نضيف tenantId لكن بـ migration تدريجية |
| Stripe في العراق؟ | Stripe يقبل بطاقات المشتركين الدوليين، والمطاعم تدفع بكارت دولي |
| تكلفة Vercel wildcard؟ | متاح في Pro plan ($20/mo) |
