import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAnalyticsData } from "@/lib/analytics";
import { verifyRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

// ---------------------------------------------------------------------------
// Helper — get today's date string "YYYY-MM-DD" in server timezone
// ---------------------------------------------------------------------------
function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Helper — fetch AI usage info for a tenant
// ---------------------------------------------------------------------------
async function getAiUsageInfo(tenantId: string) {
  const [tenant, usageLog] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiDailyLimit: true },
    }),
    prisma.aiUsageLog.findUnique({
      where: { tenantId_date: { tenantId, date: todayString() } },
    }),
  ]);
  const aiDailyLimit = tenant?.aiDailyLimit ?? 0;
  const aiUsageToday = usageLog?.count ?? 0;
  const aiRemaining =
    aiDailyLimit > 0 ? Math.max(0, aiDailyLimit - aiUsageToday) : null;
  return { aiDailyLimit, aiUsageToday, aiRemaining };
}

// ---------------------------------------------------------------------------
// Context summary — lightweight endpoint for widget proactive alerts
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const { tenantId } = await verifyRole(["ADMIN", "MANAGER"]);
    if (!tenantId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [data, aiUsage] = await Promise.all([
      getAnalyticsData(tenantId),
      getAiUsageInfo(tenantId),
    ]);

    const todaySales = data.last7Days[6]?.revenue ?? 0;
    const yesterdaySales = data.last7Days[5]?.revenue ?? 0;
    const ordersToday = data.last7Days[6]?.orderCount ?? 0;
    const lowStockCount = data.inventoryAlerts.lowStock.length;
    const topItem = data.topItems[0]?.name ?? null;

    return NextResponse.json({
      todaySales,
      yesterdaySales,
      ordersToday,
      lowStockCount,
      topItem,
      aiDailyLimit: aiUsage.aiDailyLimit,
      aiUsageToday: aiUsage.aiUsageToday,
      aiRemaining: aiUsage.aiRemaining,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// System prompt builder — injects analytics as context
// ---------------------------------------------------------------------------
function buildSystemPrompt(
  data: Awaited<ReturnType<typeof getAnalyticsData>>,
  contextFacts: Record<string, string> = {},
): string {
  const factsSection =
    Object.keys(contextFacts).length > 0
      ? `\nمعلومات محفوظة عن هذا المطعم:\n${Object.entries(contextFacts)
          .map(([k, v]) => `  - ${k}: ${v}`)
          .join("\n")}\n`
      : "";

  const last7 = data.last7Days;
  const todaySales = last7[6]?.revenue ?? 0;
  const yesterdaySales = last7[5]?.revenue ?? 0;
  const changePct =
    yesterdaySales > 0
      ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
      : 0;

  return `أنت مستشار ذكاء اصطناعي متخصص في تحليل بيانات المطاعم. تجيب فقط بناءً على البيانات المقدمة.
${factsSection}
═══════════════════════════════
📊 البيانات التشغيلية الحالية
═══════════════════════════════

【اليوم مقابل أمس】
- مبيعات اليوم: ${todaySales.toLocaleString()}
- مبيعات أمس: ${yesterdaySales.toLocaleString()}
- التغير: ${changePct > 0 ? "+" : ""}${changePct}% ${changePct >= 0 ? "✅" : "⚠️"}
- طلبات اليوم: ${last7[6]?.orderCount ?? 0}

【آخر 7 أيام】
${last7.map((d) => `  ${d.day}: ${d.revenue.toLocaleString()} (${d.orderCount} طلب)`).join("\n")}

【أفضل 5 أصناف مبيعاً】
${data.topItems
  .slice(0, 5)
  .map(
    (i, idx) =>
      `  ${idx + 1}. ${i.name} — ${i.quantity} وحدة — إيراد ${i.revenue.toLocaleString()} — هامش ${i.marginPct}%`,
  )
  .join("\n")}

【الأصناف الأبطأ مبيعاً】
${data.slowItems.map((i) => `  - ${i.name}: ${i.quantity} وحدة`).join("\n")}

【المبيعات الشهرية (6 أشهر)】
${data.monthlySales
  .map(
    (m) =>
      `  ${m.month}: إيراد ${m.revenue.toLocaleString()} | مصاريف ${m.expenses.toLocaleString()} | صافي ${m.netProfit.toLocaleString()}`,
  )
  .join("\n")}

【ساعات الذروة (Top 5)】
${data.peakHours
  .slice(0, 5)
  .map(
    (h) => `  ${h.hour}: ${h.orderCount} طلب — ${h.revenue.toLocaleString()}`,
  )
  .join("\n")}

【العملاء】
- الإجمالي: ${data.customerStats.totalCustomers}
- جدد هذا الشهر: ${data.customerStats.newThisMonth}

【المخزون منخفض الكمية】
${data.inventoryAlerts.lowStock.map((m) => `  - ${m.name}: ${m.currentStock} ${m.unit}`).join("\n") || "  لا يوجد"}

【طرق الدفع】
${data.paymentStats.map((p) => `  - ${p.method}: ${p.count} معاملة — ${p.total.toLocaleString()}`).join("\n")}

═══════════════════════════════
📋 تعليمات الإجابة
═══════════════════════════════
- أجب باللغة العربية دائماً مع Markdown
- عند ذكر أي رقم، قارنه بأمس أو بالأسبوع الماضي واذكر نسبة التغير
- استخدم ✅ للتحسن و ⚠️ للانخفاض
- إذا سُئلت عن بيانات غير موجودة في السياق، قل ذلك صراحة
- اجعل الإجابات مختصرة وعملية — لا تطول إلا إذا طُلب تقرير
- استخدم جداول Markdown عند المقارنة بين عدة أصناف أو فترات`;
}

// ---------------------------------------------------------------------------
// OpenAI streaming
// ---------------------------------------------------------------------------
async function streamOpenAI(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<Response> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 0.6,
    max_tokens: 1200,
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) controller.enqueue(new TextEncoder().encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

// ---------------------------------------------------------------------------
// Gemini streaming
// ---------------------------------------------------------------------------
async function streamGemini(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<Response> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    // model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1]?.content ?? "";
  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(lastMessage);

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) controller.enqueue(new TextEncoder().encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

// ---------------------------------------------------------------------------
// POST — interactive chat
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await verifyRole(["ADMIN", "MANAGER"]);
    if (!tenantId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      messages: ChatMessage[];
      contextFacts?: Record<string, string>;
    };

    const { messages, contextFacts = {} } = body;
    if (!messages?.length) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    // Check daily limit
    const { aiDailyLimit, aiUsageToday } =
      await getAiUsageInfo(tenantId);
    if (aiDailyLimit > 0 && aiUsageToday >= aiDailyLimit) {
      return NextResponse.json(
        {
          error: "تم تجاوز الحد اليومي للمساعد الذكي",
          code: "DAILY_LIMIT_EXCEEDED",
          remaining: 0,
          limit: aiDailyLimit,
        },
        { status: 429 },
      );
    }

    // Increment usage before streaming
    await prisma.aiUsageLog.upsert({
      where: { tenantId_date: { tenantId, date: todayString() } },
      create: { tenantId, date: todayString(), count: 1 },
      update: { count: { increment: 1 } },
    });

    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY غير مكوّن", code: "NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY غير مكوّن", code: "NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const data = await getAnalyticsData(tenantId);
    const systemPrompt = buildSystemPrompt(data, contextFacts);

    return provider === "openai"
      ? streamOpenAI(systemPrompt, messages)
      : streamGemini(systemPrompt, messages);
  } catch (e: any) {
    console.error("AI Chat Error:", e);
    return NextResponse.json(
      { error: e.message || "خطأ داخلي" },
      { status: 500 },
    );
  }
}
