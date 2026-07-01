import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAnalyticsData } from '@/lib/analytics';
import { verifyRole } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Shared prompt builder
// ---------------------------------------------------------------------------
function buildPrompt(data: Awaited<ReturnType<typeof getAnalyticsData>>): string {
    const dq = data.dataQuality;

    // بناء قسم تحذيرات جودة البيانات
    const dataQualitySection = dq.warnings.length > 0
        ? `\n⚠️ تنبيهات جودة البيانات (يجب مراعاتها عند التحليل):\n${dq.warnings.map(w => `  - ${w}`).join('\n')}\n`
        : '';

    // تعليمات خاصة بحسب حالة البيانات
    const contextualInstructions = [
        dq.isNewRestaurant
            ? `- المطعم يعمل منذ ${dq.daysSinceFirstOrder} يوم فقط: لا تقارن بأشهر سابقة ولا تفترض اتجاهاً، ركز على ما هو متاح الآن.`
            : `- يمكن المقارنة بالأشهر السابقة لأن لدينا ${dq.daysSinceFirstOrder} يوم من البيانات.`,
        dq.recipeCompletionPct < 80
            ? `- تكلفة الأصناف التي مصدرها "missing" = صفر حقيقي، لا تحسب هامش ربحها. الأصناف التي مصدرها "recipe" محسوبة من الوصفة.`
            : `- بيانات التكلفة موثوقة (${dq.recipeCompletionPct}% من الأصناف لها وصفات).`,
        !dq.hasSufficientHistory
            ? `- عدد الطلبات (${dq.totalOrders}) غير كافٍ للتحليل الإحصائي الدقيق — قدّم توصيات تأسيسية بدلاً من اتجاهات.`
            : '',
    ].filter(Boolean).join('\n');

    return `أنت مستشار ذكاء اصطناعي متخصص في تحسين أداء المطاعم وزيادة الأرباح.
لديك البيانات التشغيلية الكاملة للمطعم. مهمتك: تحليل عميق وواقعي وتقديم توصيات قابلة للتطبيق فوراً.

═══════════════════════════════════════════════
📊 حالة البيانات
═══════════════════════════════════════════════
- عمر البيانات: ${dq.daysSinceFirstOrder} يوم
- إجمالي الطلبات المكتملة: ${dq.totalOrders}
- اكتمال بيانات التكلفة: ${dq.recipeCompletionPct}% (${dq.itemsWithRecipe}/${dq.totalMenuItems} صنف)
- هل البيانات كافية للتحليل؟ ${dq.hasSufficientHistory ? 'نعم ✅' : 'لا، البيانات أولية ⚠️'}
${dataQualitySection}
═══════════════════════════════════════════════
📊 البيانات التشغيلية
═══════════════════════════════════════════════

【1】أداء الأصناف (costSource: stored=محسوب من الطلب، recipe=من الوصفة، missing=غير متوفر):
${JSON.stringify(data.topItems, null, 2)}

【2】الأصناف الأبطأ مبيعاً:
${JSON.stringify(data.slowItems, null, 2)}

【3】المبيعات الشهرية (الإيرادات / المصاريف / صافي الربح):
${JSON.stringify(data.monthlySales, null, 2)}

【4】أداء آخر 7 أيام:
${JSON.stringify(data.last7Days, null, 2)}

【5】ساعات الذروة:
${JSON.stringify(data.peakHours, null, 2)}

【6】إحصاءات العملاء:
${JSON.stringify(data.customerStats, null, 2)}

【7】المخزون (الأقل كمية):
${JSON.stringify(data.inventoryAlerts, null, 2)}

【8】توزيع طرق الدفع:
${JSON.stringify(data.paymentStats, null, 2)}

═══════════════════════════════════════════════
📋 تعليمات التحليل
═══════════════════════════════════════════════
${contextualInstructions}

قدم تقريراً استشارياً يشمل الأقسام التالية:

## 🔴 التنبيهات العاجلة
مشاكل تحتاج تدخلاً فورياً. إذا لم توجد مشاكل، اكتب "لا توجد تنبيهات عاجلة ✅".

## 📈 تحليل المبيعات والاتجاهات
${dq.isNewRestaurant
    ? '- المطعم جديد: ركز على الأيام السبعة الماضية فقط. لا تقارن بشهور.'
    : '- قارن الشهر الحالي بالسابق، واذكر نسبة التغير.'}
- أفضل يوم وأسوأ يوم في آخر 7 أيام.

## 🍽️ تحليل القائمة (Menu Engineering)
- صنّف الأصناف: نجوم / أحصنة / مشاكل / علامات استفهام.
- تجاهل تماماً حساب هامش الربح لأي صنف costSource = "missing".
- اقترح عروضاً محددة بأرقام واقعية.

## ⏰ إدارة الذروة والطاقم
- الساعات الأكثر ازدحاماً وكيفية الاستعداد لها.
- الساعات الهادئة وكيف تملأها.

## 👥 تحليل العملاء والولاء
- حالة قاعدة العملاء وتوصيات برنامج الولاء.

## 💰 صحة الربحية
${dq.recipeCompletionPct < 50
    ? '- بيانات التكلفة غير مكتملة — اذكر ذلك بوضوح وقدّم توصيات لإكمالها أولاً.'
    : '- هامش الربح الإجمالي وأفضل/أسوأ الأصناف ربحية.'}

## 🎯 خطة العمل الفورية
3 إجراءات محددة مرتبة حسب الأولوية، قابلة للتنفيذ هذا الأسبوع.

قواعد صارمة:
- استخدم أرقاماً من البيانات فقط، لا تخمّن أبداً.
- الإجابة باللغة العربية فقط مع Markdown ورموز.
- إذا كانت البيانات غير كافية في قسم، قل ذلك صراحة.
`;
}


// ---------------------------------------------------------------------------
// OpenAI streaming handler
// ---------------------------------------------------------------------------
async function streamOpenAI(prompt: string): Promise<Response> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        temperature: 0.7,
    });

    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of response) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                }
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-AI-Provider': 'openai',
        },
    });
}

// ---------------------------------------------------------------------------
// Gemini streaming handler
// ---------------------------------------------------------------------------
async function streamGemini(prompt: string): Promise<Response> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    // const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const result = await model.generateContentStream(prompt);

    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    controller.enqueue(new TextEncoder().encode(text));
                }
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-AI-Provider': 'gemini',
        },
    });
}

// ---------------------------------------------------------------------------
// Main route
// ---------------------------------------------------------------------------
export async function GET(_req: Request) {
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);

        if (!tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

        // Validate API key availability based on selected provider
        if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                error: 'مفتاح OpenAI غير مكوّن. أضف OPENAI_API_KEY في ملف .env أو غيّر AI_PROVIDER إلى "gemini".',
                code: 'OPENAI_NOT_CONFIGURED',
            }, { status: 503 });
        }

        if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                error: 'مفتاح Gemini غير مكوّن. أضف GEMINI_API_KEY في ملف .env أو غيّر AI_PROVIDER إلى "openai".',
                code: 'GEMINI_NOT_CONFIGURED',
            }, { status: 503 });
        }

        const data = await getAnalyticsData(tenantId);
        const prompt = buildPrompt(data);

        if (provider === 'openai') {
            return await streamOpenAI(prompt);
        } else {
            return await streamGemini(prompt);
        }

    } catch (e: any) {
        console.error('AI Insights Error:', e);
        return NextResponse.json({ error: e.message || 'حدث خطأ داخلي' }, { status: 500 });
    }
}
