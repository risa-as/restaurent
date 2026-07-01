# مواصفات تتبع السائق في الوقت الفعلي
# **Real-Time Driver Tracking — Spec v1.0**

> **Phase 6.6** | الأولوية: 🔴 حرجة للتشغيل الميداني
> **المكتبات**: Pusher Channels (WebSocket) · Leaflet + react-leaflet (OpenStreetMap)

---

## 1. Architecture Overview — نظرة عامة على البنية

```
┌─────────────────────────────────────────────────────────────┐
│                        DATA FLOW                             │
│                                                              │
│  📱 Driver's Browser (PWA)                                   │
│     └─ navigator.geolocation.watchPosition()                 │
│          │ every 10s (throttled)                             │
│          ▼                                                   │
│  🔗 Next.js API Route                                        │
│     POST /api/delivery/location                              │
│     └─ verifyRole(['DRIVER'])                                │
│     └─ validate deliveryId + status === 'ON_THE_WAY'         │
│          │                                                   │
│          ▼                                                   │
│  📡 Pusher Server SDK                                        │
│     channel: `delivery-{deliveryId}`                         │
│     event:   `location-update`                               │
│     data:    { lat, lng, heading, speed, timestamp }         │
│          │                                                   │
│          ▼                                                   │
│  🗺️  Manager's Browser                                       │
│     DriverMapModal (React-Leaflet)                           │
│     └─ pusher.subscribe(`delivery-{deliveryId}`)             │
│     └─ marker.setLatLng([lat, lng]) — smooth interpolation   │
│     └─ polyline trail of last 20 points                      │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibility Map

| Layer | Component | Responsibility |
|---|---|---|
| Driver App | `DriverLocationEmitter` (client) | GPS watchPosition, throttle, POST to API |
| API | `POST /api/delivery/location` | Auth, status gating, Pusher trigger |
| Server | `triggerPusher()` in `lib/pusher.ts` | Re-use existing Pusher helper |
| Manager UI | `DriverMapModal` (client) | Leaflet map, live marker, trail polyline |
| Delivery Page | Existing `delivery-list.tsx` | "تتبع مباشر" button → opens modal |

---

## 2. Security & Privacy Rules — أمان وخصوصية

### 2.1 التتبع يعمل فقط عند الحالة `ON_THE_WAY`

- **API Route يتحقق صارماً**: قبل أي trigger لـ Pusher، يجب التحقق من:
  ```
  delivery.status === 'ON_THE_WAY'
  delivery.driver.id === session.user.id   ← السائق يُرسل موقعه فقط
  ```
- إذا تغيّرت الحالة إلى `DELIVERED` أو `CANCELLED`، تتوقف الإرسالات تلقائياً من الجانبين.

### 2.2 قواعد الوصول

| الصلاحية | يرى الخريطة؟ | يُرسل الموقع؟ |
|---|---|---|
| DRIVER | ❌ | ✅ (موقعه فقط) |
| ADMIN / MANAGER / DELIVERY_MANAGER | ✅ | ❌ |
| باقي الأدوار | ❌ | ❌ |

### 2.3 انتهاء جلسة التتبع

- **تلقائياً**: عند تغيير حالة التوصيل إلى `DELIVERED` أو `CANCELLED` من خلال الـ API، يُرسل Pusher حدث `tracking-ended` على نفس القناة → المودال يُغلق نفسه.
- **يدوياً**: المدير يمكنه إغلاق المودال في أي وقت.
- **انتهاء الجلسة**: بعد 30 دقيقة بدون تحديثات، يُعتبر السائق غير متصل.

---

## 3. Frontend Emitter — تطبيق السائق (Driver PWA)

### 3.1 دورة حياة `watchPosition`

```
Component Mount
    │
    ▼
navigator.permissions.query({ name: 'geolocation' })
    │
    ├─ 'denied'  → عرض UI تحذير: "يتطلب صلاحية الموقع"
    ├─ 'prompt'  → طلب الصلاحية + شرح سبب الحاجة
    └─ 'granted' → تشغيل watchPosition()
                        │
                        ▼ (كل تحديث GPS)
                    throttle: تجاهل الحدث إن كان أقل من 10 ثوانٍ من السابق
                    distance filter: تجاهل إن كان التغيير < 15 متراً
                        │
                        ▼
                    POST /api/delivery/location
                    { deliveryId, lat, lng, heading, speed }

Component Unmount / status !== 'ON_THE_WAY'
    └─ navigator.geolocation.clearWatch(watchId)
```

### 3.2 تحسين البطارية (Battery Optimization)

| الإعداد | القيمة | السبب |
|---|---|---|
| `enableHighAccuracy` | `true` | دقة مقبولة للتتبع |
| `maximumAge` | `5000ms` | استخدام cache إن كان حديثاً |
| `timeout` | `15000ms` | تفادي انتظار طويل |
| Throttle interval | `10 ثوانٍ` | تقليل طلبات الشبكة والبطارية |
| Min distance delta | `15 متر` | لا ترسل إن كان السائق ثابتاً |

### 3.3 معالجة رفض الصلاحية

```
GPS Permission Denied
    └─ عرض رسالة واضحة: "لا يمكن تتبع موقعك بدون صلاحية GPS"
    └─ زر: "فتح إعدادات المتصفح"
    └─ بديل: تتبع رقمي فقط (تحديث الحالة يدوياً)
```

### 3.4 Component المقترح: `DriverLocationEmitter`

**الموقع**: `src/components/delivery/driver-location-emitter.tsx`

**Props**:
```typescript
interface Props {
  deliveryId: string;
  isActive: boolean;  // true فقط عندما status === 'ON_THE_WAY'
}
```

**السلوك**:
- تشغيل `watchPosition` عند `isActive = true`
- إيقاف `clearWatch` فوراً عند `isActive = false`
- لا تُصيّر أي UI إضافي (invisible component)

---

## 4. Manager UI — نافذة الخريطة (DriverMapModal)

### 4.1 واجهة المستخدم

```
┌─────────────────────────────────────────────────────┐
│  🗺️  تتبع السائق: [اسم السائق]        [✕ إغلاق]   │
│  📍 آخر تحديث: منذ 3 ثوانٍ                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│                 [OpenStreetMap]                     │
│                                                     │
│          🔵 (نقطة التسليم)                          │
│                  ↑ خط المسار                        │
│            📍 (السائق — يتحرك)                      │
│                                                     │
│  ══════════════════════════════                     │
│  السرعة: 45 كم/س | الاتجاه: شمال                   │
└─────────────────────────────────────────────────────┘
```

### 4.2 معالجة تحديثات Leaflet

**الإستراتيجية**: Smooth interpolation بدلاً من القفز المفاجئ

```
onPusherEvent('location-update', data) {
    1. إضافة data إلى قائمة النقاط (max 20 نقطة)
    2. تحديث polyline (trail) بكل النقاط
    3. marker.setLatLng([data.lat, data.lng])  ← Leaflet يتعامل بسلاسة
    4. تحديث "آخر تحديث" timestamp
    5. إذا تجاوز 30 دقيقة بدون تحديث → عرض "السائق غير متصل"
}
```

### 4.3 الإعدادات التقنية للخريطة

```typescript
// Map options
{
  center: [delivery.lat, delivery.lng],  // موقع العميل
  zoom: 14,
  zoomControl: true,
  scrollWheelZoom: true,
}

// TileLayer
"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
attribution: '© OpenStreetMap contributors'

// Markers
driverMarker: DivIcon (أيقونة سيارة SVG مخصصة)
destinationMarker: DivIcon (أيقونة منزل SVG)
```

### 4.4 API Route المطلوب

**المسار**: `src/app/api/delivery/location/route.ts`

```
POST /api/delivery/location
Body: { deliveryId: string, lat: number, lng: number, heading?: number, speed?: number }
Auth: verifyRole(['DRIVER'])
Guards:
  - تحقق أن delivery.driverId === user.id
  - تحقق أن delivery.status === 'ON_THE_WAY'
Action:
  - اختياري: حفظ آخر موقع في DB (حقل lastLat, lastLng في Delivery)
  - إجباري: triggerPusher(`delivery-${deliveryId}`, 'location-update', data)
Response: { ok: true }
```

---

## 5. المخطط البياني لـ Pusher Channels

```
القنوات المستخدمة:

'kitchen'          → new-order, order-updated        (من Phase 6.1)
'tables'           → table-updated                   (مستقبلاً)
'delivery-{id}'    → location-update, tracking-ended (Phase 6.6)
```

---

## 6. schema.prisma — التعديلات المطلوبة

```prisma
model Delivery {
  // ... الحقول الموجودة

  // ── الحقول الجديدة للتتبع ──
  lastLat   Float?   // آخر خط عرض معروف
  lastLng   Float?   // آخر خط طول معروف
  lastLocAt DateTime? // وقت آخر تحديث للموقع
}
```

> **ملاحظة**: حفظ الموقع في DB اختياري في المرحلة الأولى. Pusher يُبثّ الموقع مباشرة بدون تخزين.

---

## 7. خطة التحقق (Verification Plan)

### اختبار يدوي

1. **سائق**: افتح `/delivery` → ابدأ توصيل → غيّر الحالة إلى `ON_THE_WAY`
2. تحقق أن `DriverLocationEmitter` طلب صلاحية GPS
3. **مدير**: افتح نفس طلب التوصيل → اضغط "تتبع مباشر"
4. تحقق أن الخريطة تفتح وتعرض موقع السائق
5. تحرّك السائق → تحقق أن العلامة تنتقل خلال ≤ 12 ثانية
6. غيّر الحالة إلى `DELIVERED` → تحقق أن الخريطة تغلق تلقائياً

### اختبار رفض الصلاحية
1. ارفض صلاحية GPS في المتصفح
2. تحقق أن رسالة تحذير واضحة تظهر
3. تحقق أن التطبيق لا يتعطل
