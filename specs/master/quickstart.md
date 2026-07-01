# Quick Start: دليل تشغيل النظام الكامل

**Branch**: `master` | **Date**: 2026-03-13

---

## المتطلبات الأساسية

```bash
node >= 18
npm >= 9
PostgreSQL >= 14
```

### أدوات اختيارية
```bash
stripe CLI       # لاختبار webhooks محلياً
resend account   # لإرسال الإيميلات
```

---

## 1. تثبيت المشروع

```bash
git clone <repo-url>
cd restaurant
npm install
```

---

## 2. إعداد متغيرات البيئة

انسخ الملف وأضف القيم الحقيقية:

```bash
cp .env.example .env.local
```

محتوى `.env.local` الكامل:

```env
# قاعدة البيانات
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/restaurant_db"

# NextAuth
NEXTAUTH_SECRET="your-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (وضع التجربة)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...        # ID خطة Basic في Stripe
STRIPE_PRICE_PRO=price_...          # ID خطة Pro في Stripe
STRIPE_PRICE_ENTERPRISE=price_...  # ID خطة Enterprise

# البريد الإلكتروني (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# الإعدادات العامة
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000

# Pusher (الإشعارات الفورية)
PUSHER_APP_ID=...
PUSHER_SECRET=...
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...

# AI Analytics (اختياري)
OPENAI_API_KEY=sk-...
```

---

## 3. إعداد قاعدة البيانات

```bash
# إنشاء الجداول
npx prisma migrate dev --name init

# seed: بيانات تجريبية للمطعم الرئيسي
npx tsx prisma/seed-tenant.ts

# seed: حساب Super Admin
npx tsx prisma/seed-superadmin.ts
```

---

## 4. تشغيل المشروع

```bash
npm run dev
```

افتح المتصفح على: `http://localhost:3000`

---

## 5. تسجيل الدخول الأول

| الدور | الإيميل | كلمة السر |
|-------|---------|-----------|
| Super Admin | superadmin@system.com | (من seed-superadmin.ts) |
| Admin المطعم | admin@restaurant.com | (من seed-tenant.ts) |

---

## 6. تسجيل مطعم جديد (الـ Onboarding)

1. افتح `http://localhost:3000`
2. اضغط "سجّل مطعمك"
3. أدخل بيانات المطعم (الاسم، الـ slug)
4. أدخل بيانات المالك
5. اختر خطة الاشتراك
6. ✅ سيصل إيميل ترحيب تلقائياً

---

## 7. اختبار Stripe (محلياً)

```bash
# 1. شغّل الـ CLI لاستقبال webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 2. في نافذة أخرى — اختبر checkout
stripe trigger checkout.session.completed

# 3. اختبر فشل الدفع
stripe trigger invoice.payment_failed
```

---

## 8. الـ Subdomains محلياً

لتجربة multi-tenancy على الجهاز المحلي:

```bash
# أضف للـ hosts file (C:\Windows\System32\drivers\etc\hosts على Windows)
127.0.0.1  localhost
127.0.0.1  demo.localhost
127.0.0.1  restaurant2.localhost
```

ثم افتح: `http://demo.localhost:3000`

---

## 9. بناء الـ Production

```bash
npm run build
npm start
```

أو مع Docker:
```bash
docker build -t restaurant-saas .
docker run -p 3000:3000 --env-file .env.local restaurant-saas
```

---

## 10. الـ Routes الرئيسية

| المسار | الوصف | الصلاحية |
|--------|-------|----------|
| `/` | Landing page | عام |
| `/register` | تسجيل مطعم جديد | عام |
| `/login` | تسجيل الدخول | عام |
| `/dashboard` | لوحة التحكم | ADMIN/MANAGER |
| `/dashboard/menu` | إدارة القائمة | ADMIN/MANAGER |
| `/dashboard/billing` | الاشتراك والدفع | ADMIN |
| `/dashboard/analytics` | تحليلات AI | ADMIN/MANAGER |
| `/dashboard/settings/branding` | تخصيص المظهر | ADMIN |
| `/dashboard/settings/qr` | إنشاء QR Codes | ADMIN/MANAGER |
| `/superadmin` | لوحة Super Admin | SUPER_ADMIN |
| `/menu/[slug]` | قائمة العميل QR | عام |
| `/kitchen` | شاشة المطبخ | CHEF |
| `/cashier` | شاشة الكاشير | CASHIER |
| `/captain` | شاشة الكابتن | CAPTAIN |
| `/delivery` | شاشة السائق | DRIVER |

---

## 11. اختبار Rate Limiting

النظام يطبق الحدود التالية تلقائياً:

| النوع | الحد | النافذة |
|-------|-----|---------|
| Auth/Login | 10 طلبات | دقيقة |
| API عام | 120 طلب | دقيقة |
| صفحات | 200 طلب | دقيقة |

عند تجاوز الحد → HTTP `429 Too Many Requests`

---

## 12. استكشاف الأخطاء

```bash
# فحص الـ TypeScript
npx tsc --noEmit

# فحص قاعدة البيانات
npx prisma studio

# إعادة generate الـ Prisma client
npx prisma generate

# عرض الـ logs
npm run dev 2>&1 | tee dev.log
```

---

## ملاحظات المطور

- **Multi-tenancy**: كل query في `server actions` تضيف `tenantId` تلقائياً إذا كان المستخدم ليس SUPER_ADMIN
- **Rate Limiting**: مُنفَّذ في `src/middleware.ts` (in-memory per Edge instance)
- **White Labeling**: CSS variables مُحقَنة من tenant headers في `layout.tsx`
- **QR Menu**: `/menu/[slug]` عام بدون تسجيل دخول، يرسل الطلبات مباشرة للمطبخ
