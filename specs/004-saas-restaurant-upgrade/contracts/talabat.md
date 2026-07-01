# Talabat Webhook Contract

**Note**: Talabat's partner API documentation is not publicly available. This contract defines the **expected** payload structure based on industry-standard food aggregator APIs (Deliverect, Uber Eats, similar). Actual integration requires partner API access and may require adjustments.

---

## Inbound Webhook: New Order

**Endpoint**: `POST /api/webhooks/talabat`

**Headers**:
```
Content-Type: application/json
X-Talabat-Signature: <HMAC-SHA256(webhookSecret, rawBody)>
X-Talabat-Timestamp: <unix timestamp>
```

**Expected body**:
```json
{
  "orderId": "TAL-2026-001234",
  "restaurantId": "TALABAT_STORE_ID",
  "orderType": "DELIVERY | PICKUP",
  "status": "PENDING",
  "customer": {
    "name": "أحمد علي",
    "phone": "+9647801234567",
    "address": {
      "street": "شارع الرشيد",
      "city": "بغداد",
      "lat": 33.3152,
      "lng": 44.3661
    }
  },
  "items": [
    {
      "externalId": "TALABAT_ITEM_ID",
      "name": "برغر",
      "quantity": 2,
      "unitPrice": 7500,
      "modifiers": [
        { "name": "جبنة إضافية", "price": 1500 }
      ]
    }
  ],
  "subtotal": 15000,
  "deliveryFee": 3000,
  "discount": 0,
  "total": 18000,
  "currency": "IQD",
  "estimatedPickupTime": "2026-03-23T14:30:00Z",
  "notes": "لا بصل"
}
```

---

## Outbound: Status Update

**Method**: `POST` to Talabat's API endpoint (stored in `TalabatConfig.apiEndpoint`)

**Headers**:
```
Authorization: Bearer {apiKey}
Content-Type: application/json
```

**Body**:
```json
{
  "orderId": "TAL-2026-001234",
  "status": "CONFIRMED | PREPARING | READY | PICKED_UP | CANCELLED",
  "estimatedReadyTime": "2026-03-23T14:35:00Z"
}
```

---

## Menu Sync: Push Categories & Items

**Method**: `PUT` to Talabat's menu API endpoint

**Body**:
```json
{
  "restaurantId": "TALABAT_STORE_ID",
  "categories": [
    {
      "externalId": "CATEGORY_CUID",
      "name": "مشويات",
      "items": [
        {
          "externalId": "ITEM_CUID",
          "name": "برغر",
          "description": "وصف الصنف",
          "price": 7500,
          "isAvailable": true,
          "image": "https://cdn.example.com/burger.jpg"
        }
      ]
    }
  ]
}
```
