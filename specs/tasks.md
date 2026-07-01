# AI Chat Assistant — Spec & Task List

## Overview
An interactive AI chat widget embedded in the dashboard that allows Admin/Manager to query restaurant
analytics (sales, profits, expenses, inventory, customers) using natural language, powered by OpenAI
(GPT-4o-mini) or Google Gemini, selectable via `.env`.

---

## Architecture

```
Client (AIChatWidget)
  ├── GET  /api/ai-chat          → light context summary (alerts, today vs yesterday)
  └── POST /api/ai-chat          → streaming chat response (OpenAI or Gemini)

Server (route.ts)
  ├── verifyRole(['ADMIN','MANAGER'])
  ├── getAnalyticsData(tenantId)   ← existing analytics.ts
  └── stream via AI_PROVIDER env  ← 'openai' | 'gemini'
```

## Environment Variables
```env
AI_PROVIDER=openai           # or: gemini
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
```

---

## Feature List

### 🔴 Critical (implemented in v1)

| # | Feature | Status |
|---|---------|--------|
| 1 | Streaming responses (word-by-word like ChatGPT) | ✅ |
| 2 | Smart question suggestions (time + stock based) | ✅ |
| 3 | Visual responses — markdown tables styled (remark-gfm) | ✅ |
| 4 | Copy button per message | ✅ |
| 5 | Proactive alerts (today < yesterday by 30%, low stock) | ✅ |
| 6 | Both OpenAI + Gemini via `AI_PROVIDER` env | ✅ |

### 🟡 Useful (implemented in v1)

| # | Feature | Status |
|---|---------|--------|
| 7 | Context facts memory (localStorage — key facts only) | ✅ |
| 8 | Favorite questions (localStorage, pin/unpin) | ✅ |
| 9 | Auto-comparison (AI instructed to compare with yesterday) | ✅ |

### 🟢 Future (V2 — not implemented)

| # | Feature | Notes |
|---|---------|-------|
| 10 | Voice input (Web Speech API) | Needs HTTPS |
| 11 | Export PDF | `window.print()` or jsPDF |
| 12 | Inline charts (Recharts) per response | Needs response format change |

---

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `specs/tasks.md` | **Create** | This file |
| `src/app/api/ai-chat/route.ts` | **Create** | GET (context) + POST (streaming chat) |
| `src/components/analytics/ai-chat-widget.tsx` | **Create** | Full floating chat UI |
| `src/app/dashboard/layout.tsx` | **Modify** | Add `<AIChatWidget>` as floating FAB |

---

## Smart Suggestions Logic

```
Hour 6–11   → "ما كانت مبيعات أمس؟"
Hour 12–15  → "كيف أداء اليوم حتى الآن؟"
Hour 16–23  → "ما إجمالي مبيعات اليوم؟"
Day 25–31   → "ما ربح هذا الشهر؟"
Low stock   → "ما المنتجات التي تنفد من المخزون؟"
Always      → "ما أكثر الأصناف مبيعاً؟"
Always      → "ما هي ساعات الذروة؟"
Always      → "مقارنة الأسبوع الحالي بالماضي"
```

## Proactive Alerts Logic

```
if today_sales < yesterday_sales * 0.7  → "مبيعات اليوم أقل من أمس بـ X%"
if low_stock_count > 3                  → "X أصناف على وشك النفاد"
if no_orders_today                      → "لا توجد طلبات اليوم بعد"
```

## Context Memory Schema (localStorage)

```json
{
  "ai-chat-context": {
    "currency": "د.ع",
    "topItem": "اسم الصنف الأكثر مبيعاً",
    "branch": "اسم الفرع"
  },
  "ai-chat-favorites": ["سؤال 1", "سؤال 2"],
  "ai-chat-history": [{ "role": "user", "content": "..." }, ...]
}
```

---

## API Contract

### GET /api/ai-chat
Returns light analytics summary for proactive alerts.

```json
{
  "todaySales": 450000,
  "yesterdaySales": 620000,
  "lowStockCount": 4,
  "topItem": "شاورما دجاج",
  "ordersToday": 12
}
```

### POST /api/ai-chat
Body:
```json
{
  "messages": [
    { "role": "user", "content": "ما مبيعات أمس؟" }
  ],
  "contextFacts": { "currency": "د.ع" }
}
```
Returns: `text/plain` stream (UTF-8 chunks)
