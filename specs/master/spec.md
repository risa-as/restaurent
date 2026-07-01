# Feature Specification: SaaS Transformation

**Feature**: تحويل نظام إدارة المطعم الحالي إلى منصة SaaS متعددة المستأجرين  
**Date**: 2026-03-09  
**Priority**: Critical  
**Requestor**: Owner  

---

## 1. Problem Statement

النظام الحالي مصمم لخدمة مطعم واحد فقط. الهدف هو تحويله إلى منصة SaaS تستطيع خدمة مئات المطاعم بشكل مستقل، مع عزل كامل للبيانات، ونظام اشتراكات، وتسجيل ذاتي.

---

## 2. Goals

1. **Multi-Tenancy**: كل مطعم له بيانات معزولة تماماً (tenantId)
2. **Self-Onboarding**: مطعم جديد يسجل ويبدأ العمل خلال 5 دقائق
3. **Subscription Billing**: خطط اشتراك مدفوعة عبر Stripe
4. **Super Admin**: لوحة تحكم لإدارة جميع المطاعم
5. **White Labeling**: كل مطعم يخصص شعاره وألوانه
6. **QR Menu**: عميل يطلب بنفسه عبر QR
7. **Loyalty System**: نظام نقاط للعملاء
8. **AI Analytics**: تحليل أفضل الأصناف مبيعاً
9. **Google Maps Integration**: تحديد عنوان التوصيل بدقة

---

## 3. User Stories

### المطعم الجديد (Tenant Onboarding)
- كمالك مطعم، أريد التسجيل وإعداد مطعمي في خطوات بسيطة
- أريد دعوة موظفيني (كاشير، طاهي، سائق) عبر الإيميل
- أريد رفع شعاري وتخصيص ألوان نظامي

### الكاشير / العمليات اليومية
- كل الوظائف الحالية تعمل تحت tenant المطعم فقط
- لا يمكن لموظف مطعم A رؤية بيانات مطعم B

### Super Admin (أنت)
- أرى جميع المطاعم المشتركة مع حالة كل اشتراك
- أستطيع إيقاف/تفعيل أي مطعم
- أرى إيراداتي الشهرية وعدد المشتركين

### العميل (QR Menu)
- أمسح QR code على الطاولة
- أختار الأصناف وأطلب مباشرة
- أتابع حالة طلبي

---

## 4. Non-Goals (خارج النطاق الحالي)

- تطبيق iOS/Android native (PWA كافٍ)
- نظام المحاسبة والضرائب التفصيلي
- تكامل مع أجهزة POS خارجية
- دعم متعدد اللغات غير العربية (MVP)

---

## 5. Technical Constraints

- **Framework**: Next.js 14+ (App Router) — لا تغيير
- **Database**: PostgreSQL via Prisma — إضافة tenantId فقط
- **Auth**: NextAuth — إضافة tenantId إلى session
- **Hosting**: Vercel (recommended) أو Railway
- **Payment**: Stripe Checkout + Webhooks
- **Email**: Resend أو SendGrid
- **Realtime**: Pusher (موجود مسبقاً)

---

## 6. Success Metrics

- مطعم جديد يكمل onboarding في < 5 دقائق
- لا تسرب بيانات بين المطاعم
- uptime 99.9%
- استهلاك DB يزداد خطياً مع عدد المطاعم (لا أسي)
