# قائمة مهام الفحص الشامل قبل النشر — نظام المطاعم SaaS

> **الهدف:** التأكد من جاهزية النظام للنشر التجاري واستقبال مشتركين فعليين.
> **المحاور:** (أ) عزل البيانات بين المؤسسات والفروع — (ب) الأمان — (ج) الصفحات التي تعمل بلا إنترنت — (د) فحص كل صفحة.
> **التقييم:** P0 = مانع للنشر يجب إصلاحه — P1 = مهم قبل استقبال مشتركين كثر — P2 = تحصين/تحسين.
> آخر تحديث: 2026-06-22

---

## 0) ملخص تنفيذي — أبرز ما تم رصده

النظام **مبني بشكل جيد** ويحتوي على تحصينات سابقة فعلية (تصحيحات VULN، تسعير من الخادم في النقاط العامة، قفل تسجيل الدخول، 2FA للسوبر أدمن، CSP، حدود طلبات). العزل الحالي يعتمد بشكل أساسي على **فلترة `tenantId` يدوية في كل استعلام**، وهي مطبّقة بشكل متسق في الملفات التي فُحصت — لكن هذا التصميم "يفشل بشكل مفتوح" (fail-open) وأي استعلام يُنسى فيه الفلتر = تسريب بين المؤسسات.

**أهم 5 مخاطر يجب حسمها قبل النشر:**

1. **العزل التلقائي يغطي 9 نماذج فقط** من أصل ~35. باقي النماذج الحساسة (الفواتير، المصاريف، الإغلاق اليومي، الورديات، أوامر الشراء...) تعتمد على فلترة يدوية بالكامل. (القسم أ)
2. **RLS غير مفعّل** على قاعدة البيانات (موثّق في `src/lib/rls/README.md`) — لا توجد طبقة دفاع ثانية على مستوى القاعدة. هذا يخالف ما هو مذكور في `CLAUDE.md` ("PostgreSQL with Row-Level Security"). (القسم أ)
3. **`ignoreBuildErrors` و `ignoreDuringBuilds` مفعّلان** في `next.config.mjs` — أخطاء TypeScript و ESLint مُخفاة عند البناء؛ خطر حقيقي لإطلاق إنتاجي. (القسم ب)
4. **حدود الطلبات (Rate limiting) في الذاكرة فقط** لكل نسخة Edge — لا تصمد عبر عدة نسخ Serverless/مناطق. ضعيفة لـ SaaS حقيقي. (القسم ب)
5. **نقطة طلب الزبون العامة `/api/qr/order`** تقبل أي قيمة `qr_session` كوكي دون ربطها بطاولة/مؤسسة → احتمال إساءة استخدام (سبام طلبات). (القسم ب)

---

## ✅ سجلّ التنفيذ (الجولة الأولى — تم فعلياً)

> الحالة بعد جولة الإصلاح: **فحص TypeScript الصارم يمرّ بصفر أخطاء** + إصلاح ثغرتَي عزل حقيقيتين.

| # | ما تم | الملفات |
|---|------|---------|
| ✅ | **توسيع الحقن التلقائي للعزل** من 9 إلى ~28 نموذجاً (كل نموذج يملك `tenantId`) + تغطية `aggregate`/`groupBy` (الأرقام المالية) | `src/lib/prisma.ts` |
| ✅ | **تحصين webhook تالابات**: توقيع إلزامي + تقييد `menuItem` بـ `tenantId` | `src/app/api/webhooks/talabat/route.ts` |
| ✅ | **تفعيل فحص TypeScript الصارم** (`ignoreBuildErrors: false`) + إصلاح **14 خطأ** كانت مخفية — منها صفحة `display/[slug]` كانت معطّلة (`prisma.menuCategory` غير موجود)، cron يستعلم بحقل `status` غير موجود، و2FA بخيار `epochTolerance` خاطئ | `next.config.mjs` + 12 ملفاً |
| ✅ | **حدّ طلبات على نقاط QR العامة** (لكل جلسة + IP) لمنع رشّ الطلبات | `src/lib/qr-rate-limit.ts`, `qr/order`, `qr/register-customer` |
| ✅ | **إصلاح ثغرة IDOR للكتابة عبر المؤسسات** في تحديث حالة أصناف المطبخ (شيف من مؤسسة قد يعدّل أصناف مؤسسة أخرى) | `src/lib/actions/kitchen.ts`, `kitchen-stations.ts` |
| ✅ | **مسح ذاكرة الأوفلاين عند تسجيل الخروج** (قوائم/طاولات) لمنع تسرّب بيانات مؤسسة لمؤسسة أخرى على جهاز مشترك — مع الحفاظ على الطلبات غير المُزامَنة | `src/lib/offline/db.ts`, `logout-button.tsx` |
| ✅ | **تعطيل قاعدة lint تجميلية** (`react/no-unescaped-entities`) للنصوص العربية | `.eslintrc.json` |

### الجولة الثانية — مسح أمني شامل + تنظيف كامل

| ✅ | ما تم | الملفات |
|---|------|---------|
| ✅ | **مسح IDOR شامل لكل عمليات الكتابة على النماذج بلا `tenantId`** (orderItem, billSplit, modifierOption, menuItemStation, menuItemModifierGroup, delivery, recipeItem...) | كل `src/lib/actions` |
| ✅ | **إصلاح IDOR إضافية**: `removeModifierGroupFromItem`, `assignItemToStation`, `removeItemFromStation`, `assignCategoryToStation` (ربط/فك ربط عبر المؤسسات) | `modifiers.ts`, `kitchen-stations.ts` |
| ✅ | **حدّ طلبات على نقطة التقييم العامة** (`/api/feedback`) لمنع رشّ التقييمات | `src/app/api/feedback/route.ts` |
| ✅ | **تدقيق مصادقة كل مسارات API الـ38** — لا يوجد مسار محمي بلا تحقق (العامة مقصودة) | جميع `src/app/api/**` |
| ✅ | **إصلاح 3 أخطاء TS في الرسوم البيانية** (recharts v3 formatter) لاستقرار البناء الصارم | `sales-chart`, `registration-chart`, `revenue-line-chart` |
| ✅ | **تنظيف كل تحذيرات lint الـ33** (واردات/متغيّرات غير مستخدمة) | ~20 ملفاً |
| ✅ | **تصحيح توثيق RLS المضلّل** في `CLAUDE.md` (العزل على مستوى التطبيق، لا RLS) | `CLAUDE.md` |

**نتيجة:** مسارات إنشاء الطلبات (`pos`/`captain`/`qr`/`offline-sync`) كلها تجلب الأصناف بنطاق المؤسسة وتشتق السعر من الخادم ✅. أكشن السوبر أدمن كلها تستدعي `requireSuperAdmin` ✅.

**ما تبقّى (يحتاج قراراً/بنية تحتية):** نقل Rate limiting إلى مخزن مشترك (Redis/Vercel KV)، قرار تفعيل RLS، الاختبار التشغيلي الفعلي للأوفلاين (تشغيل التطبيق)، وتشغيل `next build` كامل في بيئتكم كبوابة نهائية.

### الجولة الثالثة — تحقق نهائي + تحصين عزل الفروع

| ✅ | ما تم | الملفات |
|---|------|---------|
| ✅ | **بوابة البناء النهائية تمرّ نظيفة:** `npx tsc --noEmit` بصفر أخطاء + `npm run build` (مع PWA) نجح بصفر أخطاء/تحذيرات حرجة. (بند هـ-P0) | — |
| ✅ | **تحصين اختيار الفرع عبر الكوكي** (`setSelectedBranch`): إضافة `verifyRole(['ADMIN'])` + التحقق أن `branchId` يخص نفس المؤسسة قبل ضبط الكوكي. العزل كان قائماً أصلاً (فلترة `tenantId` مستقلة → فرع غريب يرجع صفر صفوف) لكن أصبح صريحاً. (بند أ-2 P1) | `src/lib/actions/branches.ts` |
| ✅ | **مراجعة مساعدات عزل الفروع** (`getBranchFilter`/`getActiveBranchId`/`getShiftBranchWhere`): غير الأدمن مقيّد دائماً بـ `branchId` من الجلسة (لا يُقرأ الكوكي له)، والأدمن فقط يبدّل عبر الكوكي. منطق "الفرع الرئيسي يشمل `branchId=null`" سليم (مقيّد بالمؤسسة). (بنود أ-2 P1) | `src/lib/utils/branch-filter.ts` |

---

## أ) عزل البيانات بين المؤسسات والفروع (Multi-Tenant Isolation)

### أ-1 — العزل على مستوى المؤسسة (Tenant)

- [ ] **P0 — جرد كامل لكل نماذج Prisma غير المشمولة بالحقن التلقائي.** امتداد Prisma في `src/lib/prisma.ts` يحقن `tenantId` تلقائياً لـ 9 نماذج فقط:
  `User, Category, MenuItem, Table, Order, Reservation, RawMaterial, Supplier, Customer`.
  جميع النماذج التالية تعتمد على فلترة يدوية ويجب التأكد من أن **كل** استعلام عليها يحوي `where: { tenantId }` (أو `order: { tenantId }` للنماذج التي لا تملك العمود):
  `Bill, Expense, DailyClose, CashierShift, PurchaseOrder, PurchaseOrderItem, SupplierPayment, InventoryBatch, InventoryTransaction, Offer, ManualPayment, ModifierGroup, ModifierOption, KitchenStation, SeasonalMenu, CustomerFeedback, VoidRequest, AiUsageLog, SystemSetting, Branch, AuditLog, Delivery, OrderItem, OrderItemModifier, RecipeItem, BillSplit, TalabatConfig, TalabatOrder, DeliveryTrackingToken, PasswordResetToken, LoginAttempt`.
- [ ] **P0 — توسيع قائمة الحقن التلقائي** لتشمل كل نموذج يملك عمود `tenantId` فعلياً (Bill, Expense, DailyClose, Offer, CashierShift, PurchaseOrder, InventoryBatch, ModifierGroup, KitchenStation, SeasonalMenu, CustomerFeedback, VoidRequest, SupplierPayment, AiUsageLog, ManualPayment, Branch). يقلّل الاعتماد على الذاكرة البشرية.
- [ ] **P0 — معالجة "الفشل المفتوح":** عند رجوع `getTenantContext()` بقيمة `null`، الامتداد لا يضيف أي فلتر → الاستعلام يرجع كل الصفوف عبر كل المؤسسات. يجب أن يفشل الاستعلام أو يرجع صفر صفوف للنماذج المعزولة بدل إرجاع كل البيانات.
- [ ] **P1 — `tenantId` قابل لـ null (`String?`)** على معظم النماذج. يسمح بصفوف "يتيمة" بلا مؤسسة. راجع هل توجد صفوف `tenantId = NULL` في الإنتاج، وفكّر بجعل العمود إلزامياً (`String`) بعد الترحيل.
- [ ] **P1 — اختبار اختراق العزل عملياً:** أنشئ مؤسستين (A و B) بحساب أدمن لكل منهما، وحاول من حساب A الوصول/التعديل على معرّفات تخص B (IDOR) عبر: تعديل طلب، تحصيل فاتورة، حذف موظف، عرض تقرير، تعيين سائق. وثّق النتيجة لكل صفحة.
- [ ] **P1 — التحقق من النماذج بلا `tenantId`** (`Delivery, OrderItem, InventoryTransaction, RecipeItem, BillSplit, OrderItemModifier, ModifierOption, TalabatOrder`): يجب أن يكون كل استعلام عليها مقيّداً عبر علاقة الأب (`order: { tenantId }`, `material: { tenantId }`, ...). تم التحقق من `delivery.ts` و`cashier.ts` (سليمة) — راجع الباقي.
- [ ] **P2 — `webhook/talabat`:** استعلام `menuItem.findMany` لا يقيّد `tenantId` صراحةً (يعتمد على `itemMapping` المُعدّ من المؤسسة). أضف `tenantId: config.tenantId` لمنع تسعير صنف من مؤسسة أخرى.

### أ-2 — عزل بين الفروع (Branch Isolation)

- [ ] **P0 — العزل بين الفروع يدوي بالكامل** عبر `getBranchFilter()` / `getActiveBranchId()` ولا يفرضه أي امتداد. راجع **كل** استعلام تشغيلي/تقريري يجب أن يطبّق فلتر الفرع: المطبخ، الكاشير، الطاولات، التقارير، المخزون، المحاسبة، التوصيل.
- [ ] **P1 — منطق "الفرع الرئيسي يشمل `branchId = null`"** (في `getShiftBranchWhere`) — تأكد أنه لا يُسرّب بيانات فرع آخر عندما يكون `branchId` فارغاً لصفوف قديمة.
- [ ] **P1 — `getActiveBranchId`:** المستخدم غير الأدمن يُقيّد دائماً بـ `branchId` من جلسته. تأكد أن المستخدم لا يستطيع تغيير `branchId` الخاص به (ليس ضمن البيانات القابلة للتعديل ذاتياً).
- [ ] **P1 — صفحات الإدارة (Admin) واختيار الفرع عبر الكوكي:** تأكد أن كوكي الفرع المختار لا يمكن تزويره للوصول لفرع خارج المؤسسة، وأن `setSelectedBranch` يتحقق أن الفرع يخص نفس المؤسسة.
- [ ] **P2 — التقارير المجمّعة (`consolidated-reports.ts`)** عبر الفروع: تأكد أنها لا تتجاوز حدود المؤسسة عند التجميع.

### أ-3 — طبقة الدفاع الثانية (RLS — اختياري لكن مُوصى به)

- [ ] **P1 — قرار صريح بخصوص RLS:** إما تفعيله وفق الخطوات في `src/lib/rls/README.md` على قاعدة فرع للاختبار أولاً، أو **تحديث `CLAUDE.md`** لإزالة الادعاء بأن RLS مفعّل (تجنّب توثيق مضلِّل).
- [ ] **P2 — سكربتات/السوبر أدمن:** أي عملية تتجاوز سياق المؤسسة (seed, cron, superadmin) يجب أن تستخدم اتصالاً/عميلاً صريحاً يتجاوز العزل، لا أن تعتمد على `null` context.

---

## ب) الفحص الشامل للأمان

### ب-1 — إعدادات النشر والبناء

- [ ] **P0 — أزل `typescript.ignoreBuildErrors: true`** و `eslint.ignoreDuringBuilds: true` من `next.config.mjs`، أصلح الأخطاء، وأعد التفعيل فقط مؤقتاً عند الحاجة. أخطاء النوع المخفاة قد تخفي ثغرات منطق.
- [ ] **P0 — متغيرات البيئة:** تأكد أن `AUTH_SECRET` قوي وفريد في الإنتاج، وأن `.env` غير متعقّب في Git (يوجد كومِت "Remove .env from tracking" — تحقق فعلياً عبر `git ls-files | grep env`).
- [ ] **P1 — مفاتيح الأطراف الثالثة** (Stripe, Pusher, Resend, UploadThing, Talabat) كلها من متغيرات بيئة سرية ولا أثر لها في الكود/المستودع.
- [ ] **P2 — `console.error` يكشف تفاصيل داخلية**: تأكد أن الأخطاء المرجعة للعميل عامة (موجود) وأن السجلات لا تُسرّب أسراراً.

### ب-2 — المصادقة والجلسات

- [ ] **P1 — مدة الجلسة 30 يوماً (JWT):** مناسبة لتطبيق سطح المكتب المحلي لكنها طويلة لـ SaaS سحابي. فكّر بتقصيرها أو بآلية إبطال.
- [ ] **P1 — قفل الحساب (10 محاولات/15 دقيقة)** عبر `LoginAttempt` يعمل على البريد فقط. أضف قفلاً مبنياً على IP أيضاً لمنع رش الحسابات (credential stuffing).
- [ ] **P1 — فرض 2FA:** مفروض على `SUPER_ADMIN` فقط. فكّر بإتاحته/فرضه اختيارياً لأدمن المؤسسات.
- [ ] **P1 — إعادة تعيين كلمة المرور:** راجع `forgot-password`/`reset-password` — صلاحية التوكن، الاستخدام مرة واحدة (`usedAt`)، عدم كشف وجود البريد (user enumeration).
- [ ] **P2 — تدوير الجلسة بعد تفعيل 2FA / تغيير كلمة المرور** لإبطال الجلسات القديمة.

### ب-3 — حدود الطلبات و حماية الواجهات

- [ ] **P0 — Rate limiting في الذاكرة فقط** (`Map` لكل نسخة Edge). على Vercel/Serverless متعدد النسخ يصبح غير فعّال. انقله إلى مخزن مشترك (Upstash Redis / Vercel KV) قبل النشر التجاري.
- [ ] **P1 — `isLocalRequest` يتخطى حدود الطلبات بالكامل** عند `host=localhost` أو IP غير معروف. تأكد أن خلف Proxy/CDN لا يُصنّف الإنتاج خطأً كـ "محلي" (انتحال `x-forwarded-for`).
- [ ] **P1 — نقطة طلب الزبون `/api/qr/order`:** تقبل أي `qr_session` كوكي (أي قيمة غير فارغة) → بوت يستطيع رشّ طلبات لأي مؤسسة عبر تغيير `tenantSlug`. اربط الجلسة بطاولة/مؤسسة عبر توكن موقّع + حد طلبات لكل جلسة/طاولة.
- [ ] **P1 — Webhooks:** تحقق توقيع Stripe و Talabat إلزامي. في `talabat`: التوقيع يُتحقق فقط **إن وُجد** (`if (signature && ...)`) — اجعله إلزامياً (ارفض إن غاب التوقيع).
- [ ] **P2 — CORS:** يسمح بأي `localhost:port` (مطلوب لتطبيق Electron) — تأكد أنه لا يُفعَّل هذا المسار في بيئة الإنتاج السحابية.

### ب-4 — رؤوس الأمان و CSP

- [ ] **P1 — CSP يسمح بـ `'unsafe-inline'` و `'unsafe-eval'`** في `script-src` — يضعف الحماية من XSS. حاول إزالتهما (nonce/hashes) أو وثّق سبب الضرورة (Pusher/PWA).
- [ ] **P2 — أضف `Strict-Transport-Security` (HSTS)** و `Permissions-Policy` للرؤوس في الإنتاج.

### ب-5 — التحكم بالصلاحيات (Authorization)

- [ ] **P0 — مراجعة كل Server Action** للتأكد من استدعاء `verifyRole([...])` بالأدوار الصحيحة + `requireTenantId(tenantId)`. النمط مطبّق جيداً في الملفات المفحوصة لكن يلزم جرد شامل.
- [ ] **P1 — رفع الامتيازات:** هل يستطيع `MANAGER` حذف/تعديل `ADMIN`؟ (في `/api/team/[id]` يُمنع حذف الذات فقط، لا يُمنع حذف أدمن من قبل مدير). راجع منطق إدارة الفريق.
- [ ] **P1 — مسارات `/superadmin`:** محمية في `auth.config.ts` (redirect لغير السوبر أدمن) — تأكد أن كل Server Action سوبر أدمن يستدعي `requireSuperAdmin()` بشكل مستقل (دفاع في العمق).
- [ ] **P2 — رفع الملفات (UploadThing):** راجع `src/app/api/uploadthing/core.ts` — التحقق من الدور، حجم/نوع الملف، وربط الملف بالمؤسسة.

---

## ج) الصفحات التي تعمل بلا إنترنت (PWA / Offline)

> الصفحات التشغيلية المُعرّفة للعمل بلا إنترنت: **المطبخ، الكاشير، الكابتن، النادل، التوصيل** (حسب `next.config.mjs` runtimeCaching + رؤوس Cache-Control).

- [ ] **P0 — اختبار شامل لكل صفحة أوفلاين:** افصل الشبكة وتحقق من: عرض البيانات المخزّنة، إنشاء طلب، تحديث حالة صنف/طلب، إغلاق فاتورة، ثم المزامنة عند العودة.
- [ ] **P0 — عدم تكرار الطلبات عند المزامنة:** يوجد إصلاح موثّق لمشكلة "إنشاء مزدوج" (`offline-queue.ts`). أعد اختبار السيناريو: إنشاء طلب أوفلاين → إغلاق التطبيق → إعادة فتح → مزامنة. تأكد من طلب واحد فقط.
- [ ] **P0 — عزل بيانات الأوفلاين في `IndexedDB`:** المخزن المحلي (`restaurant-offline`) لا يُفصل حسب المؤسسة. على جهاز يُستخدم لعدة مؤسسات (نادر لكن ممكن)، قد تختلط البيانات. تحقق من تنظيف `IndexedDB` عند تسجيل الخروج/تبديل المستخدم (`clearLiveOrders` + مسح `menu_items/tables/page_cache`).
- [ ] **P1 — التحقق من المؤسسة عند المزامنة:** `/api/offline/sync` يتحقق أن `session.tenantId === payload.tenantId` (سليم) ويعيد اشتقاق السعر/الفرع من الخادم (سليم). أعد التأكيد بعد أي تعديل.
- [ ] **P1 — انتهاء صلاحية المزامنة:** `MAX_RETRIES = 3` ثم تُسقط العملية. تأكد من إعلام المستخدم بصرياً عند فشل مزامنة عملية (حتى لا تُفقد فاتورة بصمت).
- [ ] **P1 — Service Worker معطّل في التطوير** (`disable: NODE_ENV === 'development'`). اختبر السلوك في بناء إنتاجي حقيقي (`next build && next start`)، لا في `dev`.
- [ ] **P1 — استراتيجيات الكاش:** صفحات الإدارة `NetworkOnly` (صحيح — لا أوفلاين). صفحات التشغيل `NetworkFirst` مع fallback. تأكد أن صفحة `/offline` تظهر فعلاً عند انقطاع الشبكة لصفحة غير مخزّنة.
- [ ] **P1 — تحديث الإصدار/الكاش القديم:** `skipWaiting: true` — تأكد أن المستخدمين يحصلون على آخر إصدار بعد النشر دون كاش قديم عالق (تحقق من `clientsClaim`/إبطال الكاش).
- [ ] **P2 — ترحيل مخطط `IndexedDB` (الإصدار 4):** اختبر الترقية من جهاز عليه إصدار قديم (v1–v3) لتفادي فقدان طلبات في طابور قديم.
- [ ] **P2 — manifest و أيقونات PWA:** تأكد من وجود `manifest.json` صحيح + أيقونات + ثبات التثبيت على أجهزة الأندرويد/iOS.

---

## د) الفحص الشامل لكل صفحة (مصفوفة)

لكل صفحة تحقق من: **(1)** حماية الدور الصحيح **(2)** فلترة `tenantId` + `branchId` **(3)** عرض بيانات المؤسسة الحالية فقط **(4)** عدم تعطّل عند بيانات فارغة **(5)** بوابة الخطة (Plan gate) إن لزم.

### د-1 — صفحات عامة / غير مصادَق عليها (سطح هجوم خارجي)
- [ ] `/` و `(marketing)/page.tsx` — صفحة الهبوط
- [ ] `(marketing)/privacy-policy` و `terms-of-service` — موجودة (مطلوبة قانونياً للنشر) ✅ تحقق من المحتوى
- [ ] `/login` — قفل الحساب + لا user enumeration
- [ ] `/forgot-password` و `/reset-password` — صلاحية التوكن + استخدام لمرة واحدة
- [ ] `/register` و `/register/owner` و `/register/plan` — التحقق من المدخلات، فرادة الـ slug، لا حقن
- [ ] `/menu/[slug]` — قائمة عامة؛ تعرض أصناف المؤسسة المطابقة للـ slug فقط + تُحجب للمعطّلة ✅
- [ ] `(customer)/[slug]/order` — طلب الزبون؛ راجع ربط الجلسة + حد الطلبات (ب-3)
- [ ] `/track/[token]` — تتبّع التوصيل؛ مقيّد بتوكن — تأكد أنه لا يكشف بيانات بدون توكن صالح
- [ ] `/display/[slug]` — شاشة عرض المطبخ؛ **تحقق أنها لا تُسرّب طلبات عبر slug دون مصادقة**
- [ ] `/offline` — صفحة fallback ✅
- [ ] `/auth/2fa` — إعداد/تحقق 2FA
- [ ] `/suspended` و `/past-due` و `/trial-expired` — صفحات حالة الاشتراك

### د-2 — الصفحات التشغيلية (أوفلاين)
- [ ] `/captain` و `/captain/orders` و `/captain/history` و `/captain/tables`
- [ ] `/cashier`
- [ ] `/kitchen` و `/kitchen/recipes` و `/kitchen/station/[stationId]`
- [ ] `/waiter`
- [ ] `/delivery`

### د-3 — لوحة التحكم (إدارة — أونلاين فقط)
- [ ] `/dashboard` و `/dashboard/admin`
- [ ] `/dashboard/analytics` (بوابة PRO+) و `/dashboard/alerts`
- [ ] `/dashboard/menu` و `/menu/analysis` و `/menu/modifiers` و `/menu/offers` (بوابة PRO+)
- [ ] `/dashboard/tables` و `/dashboard/reservations` و `/dashboard/customers` و `/dashboard/feedback`
- [ ] `/dashboard/finance` و `/dashboard/billing` و `/dashboard/waiter`
- [ ] `/dashboard/settings` و `/settings/team` و `/settings/branches` (بوابة ENTERPRISE) و `/settings/branding` و `/settings/qr` و `/settings/seasonal` و `/settings/talabat`
- [ ] `/dashboard/reports/consolidated` (عبر الفروع — راجع أ-2)

### د-4 — المحاسبة
- [ ] `/accountant` + `/accountant/cashier` (+history) + `/accountant/delivery` (+history) + `/accountant/reports`
- [ ] `/dashboard/accountant/*` — cashier, delivery, finance, reports, tax-report, pl-report, drivers, discrepancies, analytics

### د-5 — المخزون
- [ ] `/inventory` و `/inventory/stock` و `/inventory/suppliers` و `/inventory/purchase-orders` (بوابة PRO+)

### د-6 — السوبر أدمن (عبر المؤسسات — حساس جداً)
- [ ] `/superadmin` (لوحة) — تجميع عبر كل المؤسسات ✅ مقصود
- [ ] `/superadmin/tenants` و `/tenants/[id]` و `/tenants/new` — التحكم بالمؤسسات
- [ ] `/superadmin/revenue` و `/billing` و `/payments` و `/plans` — مالية المنصة
- [ ] `/superadmin/settings` و `/announcements` و `/audit-log`
- [ ] **تحقق:** أن كل صفحة سوبر أدمن تستدعي `requireSuperAdmin()` على مستوى الـ Server Action، لا فقط حماية المسار في الـ middleware.

---

## هـ) قبل الإطلاق مباشرة (Go-Live Checklist)

- [ ] **P0** — تشغيل `npm run build` نظيفاً **بعد** إزالة `ignoreBuildErrors` — صفر أخطاء.
- [ ] **P0** — تشغيل `npm run lint` — صفر أخطاء حرجة.
- [ ] **P0** — تشغيل `npx prisma migrate deploy` على الإنتاج (لا `db push`) + التأكد من تطابق المخطط.
- [ ] **P1** — نسخ احتياطي تلقائي لقاعدة البيانات + خطة استعادة.
- [ ] **P1** — مراقبة الأخطاء (Sentry أو ما يماثله) + سجلات.
- [ ] **P1** — اختبار دورة اشتراك كاملة: تسجيل → تجربة → دفع → ترقية خطة → انتهاء/تعليق.
- [ ] **P2** — اختبار تحمّل بسيط على نقطة طلب الزبون والمزامنة.

---

### كيفية استخدام هذه القائمة
ابدأ بكل بنود **P0** أولاً (مانعة للنشر)، ثم **P1** قبل استقبال عدد كبير من المشتركين، ثم **P2** كتحسين مستمر. عند رغبتك أستطيع البدء بتنفيذ أي قسم — أنصح بالبدء بـ (أ-1) توسيع الحقن التلقائي و (ب-1) إزالة `ignoreBuildErrors`.
