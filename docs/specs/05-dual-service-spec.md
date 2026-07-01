# 📋 Spec 05: Restaurant Service Mode Config — إعداد نمط الخدمة

> **Version**: 2.0 (Revised)
> **Date**: 2026-03-03
> **Status**: 🟡 Approved — Pending Implementation
> **Phase**: 6.7

---

## 1. المشكلة

النظام يُباع لمطاعم مختلفة:

| النوع | النمط | الصفحات المستخدمة |
|-------|-------|-------------------|
| مطعم النوع الأول | **Quick Service** — الزبون يدفع للكاشير أولاً ثم يجلس وينتظر الطعام | `/cashier` → مطبخ → نادل |
| مطعم النوع الثاني | **Table Service** — الزبون يجلس، كابتن يطلب، دفع عند الخروج | `/captain` → مطبخ → نادل → `/cashier` (حساب) |

كل مطعم يعمل **بنمط واحد فقط**. المشكلة الحالية: النظام يُظهر نفس الصفحات والأدوات لكلا النوعين.

---

## 2. الحل: إعداد على مستوى المطعم

إضافة حقل واحد في جدول `RestaurantConfig` (أو `Settings`):

```prisma
enum ServiceMode {
  QUICK_SERVICE   // كاشير مباشر
  TABLE_SERVICE   // خدمة طاولة
}

model RestaurantConfig {
  id          String      @id @default(cuid())
  serviceMode ServiceMode @default(TABLE_SERVICE)
}
```

---

## 3. التأثيرات بحسب النمط

### 3.1 Quick Service 🏪

| العنصر | السلوك |
|--------|--------|
| Sidebar | يُخفي رابط `/captain` |
| `/cashier` | يظهر حقل "رقم الطاولة" (اختياري) بدل dropdown |
| `/waiter` | يظهر الطلبات الجاهزة بدون زر "طلب الحساب" |
| الطاولات | لا تتغير حالتها (لا OCCUPIED) — اختياري |

### 3.2 Table Service 🍽️

| العنصر | السلوك |
|--------|--------|
| Sidebar | يُظهر `/captain` |
| `/captain` | كما هو — يأخذ طلب الطاولة |
| `/waiter` | يظهر زر "طلب الحساب 🧾" عند `status = SERVED` |
| `/cashier` | تبويب "حسابات الطاولات" يظهر الطاولات التي طلبت الحساب |

---

## 4. تدفق Table Service — الجزء المفقود فقط

الجزء الوحيد غير الموجود حالياً للـ Table Service هو دورة الحساب:

```
نادل/كابتن يضغط "طلب الحساب"
    → billRequested = true + Pusher → cashier
    → كاشير يرى الطاولة في قائمة "حسابات معلقة"
    → يضغط "تسوية الحساب" → يأخذ الدفع
    → Order: COMPLETED + Table: DIRTY
```

---

## 5. التغييرات التقنية المطلوبة

### Schema
```prisma
// RestaurantConfig (جديد)
model RestaurantConfig {
  id          String      @id @default(cuid())
  serviceMode ServiceMode @default(TABLE_SERVICE)
}

enum ServiceMode { QUICK_SERVICE  TABLE_SERVICE }

// Order (تعديل)
model Order {
  billRequested   Boolean   @default(false)
  billRequestedAt DateTime?
}
```

### Server Actions
| Action | الملف |
|--------|-------|
| `getConfig()` | `src/lib/actions/config.ts` |
| `updateConfig(serviceMode)` | `src/lib/actions/config.ts` |
| `requestBill(orderId)` | `src/lib/actions/waiter.ts` |
| `getPendingBills()` | `src/lib/actions/cashier.ts` |
| `settleTableBill(orderId)` | `src/lib/actions/cashier.ts` |

### UI
| المكوّن | الوصف |
|---------|-------|
| `src/components/cashier/pending-bills-view.tsx` | قائمة الطاولات التي طلبت الحساب |
| `src/components/cashier/cashier-pusher-listener.tsx` | إشعارات فورية عند طلب حساب جديد |
| `src/app/dashboard/settings/page.tsx` | صفحة الإعدادات + اختيار نمط الخدمة |
| تعديل Sidebar | إخفاء `/captain` عند Quick Service |

---

## 6. التحقق

| السيناريو | الخطوات |
|-----------|---------|
| Quick Service | إعداد النمط → كاشير يطلب → `/captain` مخفي → مطبخ → نادل يُسلم |
| Table Service | إعداد النمط → كابتن يطلب → مطبخ → نادل → "طلب الحساب" → كاشير يُسوّي |
