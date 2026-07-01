'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    LayoutDashboard, Utensils, Armchair, DollarSign, UtensilsCrossed,
    Truck, Warehouse, Receipt, Users, Settings, Sparkles, Rocket,
    ChevronLeft, ChevronRight, X, ShoppingBag, Tag, BarChart3, Bot,
    Star, Package, CalendarDays, TrendingUp, Printer,
    Timer, Bell, ClipboardList, MapPin, AlertTriangle, FileText,
    Calculator, Gift, Heart, Award, Lightbulb, MessageSquare,
    Building, Palette, Shield, Check, Zap, Eye, Activity,
    Camera, Scale, PieChart, Cpu, Globe, QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LS_KEY = 'restaurant-tour-seen';

type LucideIcon = React.ElementType;

interface Feature { icon: LucideIcon; title: string; desc: string }
interface TourStep {
    id: string;
    gradient: string;       // hero icon bg gradient
    glow: string;           // rgba glow color
    accent: string;         // Tailwind text-* for sidebar highlight
    overlay: string;        // subtle bg overlay gradient
    borderAccent: string;   // border color for feature cards
    icon: LucideIcon;
    sidebarIcon: LucideIcon;
    category: string;
    title: string;
    subtitle: string;
    description: string;
    features: Feature[];
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS: TourStep[] = [
    {
        id: 'welcome',
        gradient: 'from-violet-600 via-indigo-600 to-blue-600',
        glow: 'rgba(139,92,246,0.6)',
        accent: 'text-violet-400',
        overlay: 'from-violet-950/30 via-indigo-950/20 to-transparent',
        borderAccent: 'border-violet-500/30',
        icon: Sparkles,
        sidebarIcon: Sparkles,
        category: 'البداية',
        title: 'مرحباً بك في نظام إدارة مطعمك',
        subtitle: 'نظام متكامل من الطلبات إلى التقارير',
        description: 'اكتشف نظاماً شاملاً صُمِّم خصيصاً لإدارة مطعمك بكفاءة عالية — من استقبال الطلبات وإدارة الطاولات والمطبخ، وحتى التقارير المالية الدقيقة والمساعد الذكي. كل شيء في مكان واحد.',
        features: [
            { icon: Users,         title: 'أدوار متعددة',           desc: 'مدير، كاشير، طاهي، نادل، كابتن، سائق — كل دور بواجهة مخصصة' },
            { icon: Activity,      title: 'إشعارات فورية',          desc: 'تزامن لحظي بين جميع الأجهزة والأدوار عبر Pusher' },
            { icon: BarChart3,     title: 'تقارير شاملة',           desc: 'مالية، محاسبية، أداء الفريق — قابلة للتصدير' },
            { icon: Bot,           title: 'ذكاء اصطناعي',           desc: 'مساعد GPT-4 وGemini يجيب بأرقام حقيقية من بياناتك' },
            { icon: Building,      title: 'متعدد الفروع',            desc: 'فروع غير محدودة مع عزل تام للبيانات بين كل فرع' },
            { icon: Shield,        title: 'أمان عالي',              desc: 'صلاحيات دقيقة، تشفير، تسجيل دخول بخطوتين' },
        ],
    },
    {
        id: 'dashboard',
        gradient: 'from-blue-600 via-blue-500 to-sky-500',
        glow: 'rgba(37,99,235,0.6)',
        accent: 'text-blue-400',
        overlay: 'from-blue-950/30 via-slate-950/20 to-transparent',
        borderAccent: 'border-blue-500/30',
        icon: LayoutDashboard,
        sidebarIcon: LayoutDashboard,
        category: 'لوحة التحكم',
        title: 'نظرة شاملة على مطعمك',
        subtitle: 'مؤشرات حيوية في الوقت الفعلي',
        description: 'في ثوانٍ تعرف كيف يسير مطعمك — المبيعات اللحظية، أفضل الأصناف، حالة الطاولات، وتنبيهات المخزون. لا تحتاج إلى فتح أي صفحة أخرى لترى الصورة الكاملة.',
        features: [
            { icon: DollarSign,    title: 'المبيعات والأرباح',       desc: 'إجمالي اليوم والشهر مع مقارنة بالفترة السابقة' },
            { icon: TrendingUp,    title: 'رسوم بيانية',             desc: 'اتجاهات المبيعات الأسبوعية والشهرية التفاعلية' },
            { icon: Star,          title: 'أفضل الأصناف',            desc: 'ترتيب الأصناف الأكثر مبيعاً وأعلى ربحية' },
            { icon: Armchair,      title: 'حالة الطاولات',           desc: 'عدد الطاولات المشغولة والطلبات النشطة لحظياً' },
            { icon: AlertTriangle, title: 'تنبيهات ذكية',            desc: 'مخزون منخفض، طلبات معلّقة، فروقات مالية' },
            { icon: Activity,      title: 'الأداء اللحظي',           desc: 'متوسط قيمة الطلب وعدد العملاء هذا الأسبوع' },
        ],
    },
    {
        id: 'menu',
        gradient: 'from-orange-600 via-red-500 to-pink-500',
        glow: 'rgba(234,88,12,0.6)',
        accent: 'text-orange-400',
        overlay: 'from-orange-950/30 via-red-950/20 to-transparent',
        borderAccent: 'border-orange-500/30',
        icon: Utensils,
        sidebarIcon: Utensils,
        category: 'قائمة الطعام',
        title: 'قائمة طعام احترافية',
        subtitle: 'إدارة الأصناف والعروض والتحليل',
        description: 'أنشئ قائمة طعامك الرقمية بسهولة تامة — أضف الأصناف مع صورها وأسعارها وتصنيفاتها. القائمة تُحدَّث فوراً على جميع الشاشات ورمز QR للطاولات.',
        features: [
            { icon: Camera,        title: 'الأصناف والصور',          desc: 'إضافة أصناف بالصورة والسعر والتصنيف والوصف التفصيلي' },
            { icon: Tag,           title: 'التصنيفات',               desc: 'تصنيفات مرتّبة وقابلة للتخصيص: مشويات، مشروبات...' },
            { icon: Zap,           title: 'الخيارات والإضافات',       desc: 'حجم، نكهة، إضافات بسعر منفصل لكل صنف' },
            { icon: Sparkles,      title: 'عروض وخصومات',            desc: 'خصومات زمنية مع تفعيل وإيقاف تلقائي حسب التاريخ' },
            { icon: BarChart3,     title: 'تحليل الربحية',            desc: 'هامش ربح كل صنف بناءً على تكلفة وصفته الدقيقة' },
            { icon: Globe,         title: 'قائمة موسمية',            desc: 'قوائم ليلية ونهارية وموسمية بجدولة تلقائية' },
        ],
    },
    {
        id: 'tables',
        gradient: 'from-emerald-600 via-green-500 to-teal-500',
        glow: 'rgba(5,150,105,0.6)',
        accent: 'text-emerald-400',
        overlay: 'from-emerald-950/30 via-green-950/20 to-transparent',
        borderAccent: 'border-emerald-500/30',
        icon: Armchair,
        sidebarIcon: Armchair,
        category: 'الطاولات والحجوزات',
        title: 'خطة طابق ذكية وتفاعلية',
        subtitle: 'إدارة الجلوس والحجوزات المسبقة',
        description: 'أرَ حالة كل طاولة لحظياً — متاحة، مشغولة، تحتاج تنظيف. أدِر الجلوس والحجوزات المسبقة وتتبع وقت الجلوس بدقة متناهية.',
        features: [
            { icon: MapPin,        title: 'خطة الطابق',              desc: 'خريطة مرئية قابلة للتخصيص بالسحب والإفلات' },
            { icon: Activity,      title: 'حالة الطاولات',           desc: 'متاحة / مشغولة / تحتاج تنظيف — تحديث فوري' },
            { icon: Timer,         title: 'عداد وقت الجلوس',         desc: 'تنبيه تلقائي عند تجاوز وقت الجلوس المحدد' },
            { icon: CalendarDays,  title: 'الحجوزات المسبقة',        desc: 'نظام حجوزات مع تأكيد وتذكير تلقائي' },
            { icon: Users,         title: 'ربط الطاولة بالنادل',     desc: 'تخصيص نادل مسؤول عن كل طاولة' },
            { icon: QrCode,        title: 'QR Code لكل طاولة',       desc: 'الزبون يطلب مباشرة من هاتفه دون نادل' },
        ],
    },
    {
        id: 'cashier',
        gradient: 'from-teal-600 via-cyan-500 to-sky-500',
        glow: 'rgba(13,148,136,0.6)',
        accent: 'text-teal-400',
        overlay: 'from-teal-950/30 via-cyan-950/20 to-transparent',
        borderAccent: 'border-teal-500/30',
        icon: DollarSign,
        sidebarIcon: DollarSign,
        category: 'الكاشير (POS)',
        title: 'نقطة بيع سريعة وموثوقة',
        subtitle: 'معالجة المدفوعات وإدارة الشفتات',
        description: 'كاشير متكامل يعالج المدفوعات بدقة عالية — نقد أو بطاقة، مع إدارة الشفتات وطباعة الفواتير الحرارية وسجل كامل لجميع المعاملات.',
        features: [
            { icon: DollarSign,    title: 'دفع نقدي وبطاقة',         desc: 'احتساب الباقي تلقائياً مع دعم طرق دفع متعددة' },
            { icon: Receipt,       title: 'تسوية الفواتير',           desc: 'معالجة دفع الطاولات من لوحة الكاشير مباشرة' },
            { icon: Timer,         title: 'إدارة الشفت',             desc: 'فتح وإغلاق الشفت مع تقرير تفصيلي للمبالغ' },
            { icon: Printer,       title: 'طباعة الفاتورة',           desc: 'فاتورة حرارية بشعار المطعم والضريبة والخدمة' },
            { icon: ClipboardList, title: 'سجل المعاملات',            desc: 'كل طلبات اليوم مع إمكانية إعادة الطباعة' },
            { icon: BarChart3,     title: 'تقرير إغلاق اليوم',       desc: 'ملخص الشفت: نقد، بطاقة، إجمالي المبيعات' },
        ],
    },
    {
        id: 'captain',
        gradient: 'from-indigo-600 via-violet-600 to-purple-600',
        glow: 'rgba(79,70,229,0.6)',
        accent: 'text-indigo-400',
        overlay: 'from-indigo-950/30 via-violet-950/20 to-transparent',
        borderAccent: 'border-indigo-500/30',
        icon: Users,
        sidebarIcon: Users,
        category: 'الكابتن',
        title: 'قائد الخدمة في القاعة',
        subtitle: 'إدارة الطاولات وتنسيق الفريق',
        description: 'الكابتن يرى كل شيء — حالة الطاولات، يستقبل الطلبات، يتابع الطلبات النشطة، ويطلب الحساب. واجهة مصممة للعمل السريع من أي جهاز.',
        features: [
            { icon: Eye,           title: 'لوحة الطاولات',           desc: 'عرض جميع الطاولات وحالاتها وطلباتها النشطة' },
            { icon: ClipboardList, title: 'إنشاء الطلبات',           desc: 'طلبات جديدة وإضافة أصناف للطلبات الحالية' },
            { icon: Activity,      title: 'تتبع الطلبات',            desc: 'من المطبخ إلى التسليم — تحديث مستمر' },
            { icon: Receipt,       title: 'طلب الحساب',              desc: 'إبلاغ الكاشير بطلب الدفع مباشرة' },
            { icon: Bell,          title: 'الإشعارات الفورية',       desc: 'تنبيه فوري بأي تحديث في الطلبات والطاولات' },
            { icon: BarChart3,     title: 'تاريخ الطلبات',           desc: 'سجل كامل لطلبات اليوم مع تفاصيل المبالغ' },
        ],
    },
    {
        id: 'waiter',
        gradient: 'from-sky-600 via-blue-500 to-indigo-500',
        glow: 'rgba(2,132,199,0.6)',
        accent: 'text-sky-400',
        overlay: 'from-sky-950/30 via-blue-950/20 to-transparent',
        borderAccent: 'border-sky-500/30',
        icon: ShoppingBag,
        sidebarIcon: ShoppingBag,
        category: 'النادل',
        title: 'تسليم سريع ودقيق',
        subtitle: 'واجهة مركّزة لخدمة الزبائن',
        description: 'النادل يرى فقط الطلبات الجاهزة من المطبخ — يستلمها، يسلّمها للزبون، يطلب الحساب، وينظّف الطاولة. واجهة بسيطة لا تشتّت الانتباه.',
        features: [
            { icon: Bell,          title: 'إشعار الطلبات الجاهزة',   desc: 'تنبيه فوري بصوت وصورة عند اكتمال الطلب' },
            { icon: Check,         title: 'تأكيد التسليم',            desc: 'تسليم الطلب للزبون بنقرة واحدة فقط' },
            { icon: Receipt,       title: 'طلب الحساب',              desc: 'إبلاغ الكاشير بطلب دفع الزبون فوراً' },
            { icon: Armchair,      title: 'الطاولات للتنظيف',        desc: 'قائمة الطاولات التي تحتاج تنظيف بعد الخروج' },
            { icon: Activity,      title: 'تحديث حالة الطاولة',      desc: 'تحديث إلى متاحة بعد التنظيف بنقرة واحدة' },
            { icon: Timer,         title: 'تتبع أوقات الخدمة',       desc: 'مراقبة وقت انتظار كل طاولة لتحسين الخدمة' },
        ],
    },
    {
        id: 'kitchen',
        gradient: 'from-red-600 via-orange-500 to-amber-500',
        glow: 'rgba(220,38,38,0.6)',
        accent: 'text-red-400',
        overlay: 'from-red-950/30 via-orange-950/20 to-transparent',
        borderAccent: 'border-red-500/30',
        icon: UtensilsCrossed,
        sidebarIcon: UtensilsCrossed,
        category: 'المطبخ',
        title: 'لوحة المطبخ الذكية',
        subtitle: 'تنظيم التحضير وتتبع الطلبات',
        description: 'الطاهي يرى كل الطلبات الجديدة مرتبة حسب الأولوية — يُحدّث حالة التحضير فوراً ويُبلَّغ النادل والكاشير تلقائياً عبر إشعارات فورية.',
        features: [
            { icon: ClipboardList, title: 'قائمة الطلبات',           desc: 'الطلبات مرتبة بالأقدم أولاً مع تفاصيل كاملة' },
            { icon: Activity,      title: 'تحديث الحالة',            desc: 'قيد التحضير / جاهز — بنقرة واحدة سريعة' },
            { icon: Bell,          title: 'إشعار النادل',             desc: 'تنبيه فوري للنادل عند اكتمال الطلب' },
            { icon: Package,       title: 'وصفات الأصناف',           desc: 'وصفة تفصيلية لكل صنف متاحة للطاهي' },
            { icon: Timer,         title: 'صوت التنبيه',              desc: 'صوت تنبيه عند وصول كل طلب جديد للمطبخ' },
            { icon: Zap,           title: 'أداء المطبخ',              desc: 'تتبع متوسط وقت التحضير لكل صنف' },
        ],
    },
    {
        id: 'delivery',
        gradient: 'from-cyan-600 via-teal-500 to-green-500',
        glow: 'rgba(8,145,178,0.6)',
        accent: 'text-cyan-400',
        overlay: 'from-cyan-950/30 via-teal-950/20 to-transparent',
        borderAccent: 'border-cyan-500/30',
        icon: Truck,
        sidebarIcon: Truck,
        category: 'التوصيل',
        title: 'إدارة التوصيل من A إلى Z',
        subtitle: 'تتبع السائقين والطلبات لحظياً',
        description: 'نظام توصيل متكامل — من استقبال الطلب وتخصيص السائق وحتى التسليم وتحصيل المبلغ. تتبع كل شيء في الوقت الفعلي.',
        features: [
            { icon: MapPin,        title: 'لوحة التوصيل',            desc: 'عرض جميع طلبات التوصيل وحالاتها' },
            { icon: Users,         title: 'تخصيص السائقين',          desc: 'تخصيص يدوي أو تلقائي حسب المنطقة' },
            { icon: Activity,      title: 'تتبع الحالات',             desc: 'قيد التحضير / مع السائق / مُسلَّم' },
            { icon: BarChart3,     title: 'أداء السائقين',            desc: 'تقارير تفصيلية: طلبات وأوقات ومسافات' },
            { icon: Receipt,       title: 'التصفيات المالية',         desc: 'تصفية مستحقات كل سائق بدقة' },
            { icon: Zap,           title: 'تكامل Talabat',            desc: 'استيراد طلبات تطبيقات التوصيل الخارجية' },
        ],
    },
    {
        id: 'inventory',
        gradient: 'from-amber-600 via-yellow-500 to-orange-400',
        glow: 'rgba(217,119,6,0.6)',
        accent: 'text-amber-400',
        overlay: 'from-amber-950/30 via-yellow-950/20 to-transparent',
        borderAccent: 'border-amber-500/30',
        icon: Warehouse,
        sidebarIcon: Warehouse,
        category: 'المخزون',
        title: 'مخزون تحت السيطرة دائماً',
        subtitle: 'تتبع المواد والموردين والشراء',
        description: 'تتبع المواد الخام وكمياتها وتكاليفها لحظياً. احصل على تنبيهات تلقائية عند الانخفاض وأنشئ طلبات شراء بنقرة واحدة.',
        features: [
            { icon: Package,       title: 'تتبع الكميات',            desc: 'كمية ووحدة وتكلفة كل مادة خام' },
            { icon: Activity,      title: 'خصم تلقائي',              desc: 'خصم المخزون عند إكمال الطلبات (FIFO)' },
            { icon: AlertTriangle, title: 'تنبيهات النفاد',           desc: 'إشعار فوري عند انخفاض المخزون عن الحد' },
            { icon: Truck,         title: 'إدارة الموردين',           desc: 'سجل الموردين والأسعار التاريخية' },
            { icon: ClipboardList, title: 'طلبات الشراء',             desc: 'إنشاء وتتبع ومصادقة طلبات الشراء' },
            { icon: Scale,         title: 'تكلفة الأصناف',           desc: 'ربط المواد بالوصفات لحساب تكلفة كل صنف' },
        ],
    },
    {
        id: 'finance',
        gradient: 'from-green-700 via-emerald-600 to-teal-500',
        glow: 'rgba(5,150,105,0.6)',
        accent: 'text-green-400',
        overlay: 'from-green-950/30 via-emerald-950/20 to-transparent',
        borderAccent: 'border-green-500/30',
        icon: Receipt,
        sidebarIcon: Receipt,
        category: 'المحاسبة والمالية',
        title: 'تقارير مالية دقيقة وشاملة',
        subtitle: 'P&L والضرائب وتصفيات الكاشير',
        description: 'كل ما يحتاجه المحاسب في مكان واحد — من P&L والضرائب إلى تصفيات الكاشير والسائقين وكشف التناقضات التلقائي.',
        features: [
            { icon: FileText,      title: 'تقرير P&L',               desc: 'أرباح وخسائر شهري تلقائي مع الاتجاهات' },
            { icon: Calculator,    title: 'التقرير الضريبي',          desc: 'احتساب الضريبة والخدمة للفترة المحددة' },
            { icon: DollarSign,    title: 'تصفيات الكاشير',           desc: 'ملخص الشفت اليومي لكل كاشير' },
            { icon: AlertTriangle, title: 'كشف التناقضات',            desc: 'رصد الفروقات بين الطلبات والمدفوعات' },
            { icon: PieChart,      title: 'تقارير موحدة',             desc: 'دمج تقارير جميع الفروع في تقرير واحد' },
            { icon: BarChart3,     title: 'تصدير البيانات',           desc: 'Excel وPDF مع فلترة حسب الفترة والفرع' },
        ],
    },
    {
        id: 'loyalty',
        gradient: 'from-pink-600 via-rose-500 to-red-400',
        glow: 'rgba(219,39,119,0.6)',
        accent: 'text-pink-400',
        overlay: 'from-pink-950/30 via-rose-950/20 to-transparent',
        borderAccent: 'border-pink-500/30',
        icon: Star,
        sidebarIcon: Star,
        category: 'الولاء والعملاء',
        title: 'احتفظ بعملائك وكافئهم',
        subtitle: 'نقاط ولاء وسجل العملاء',
        description: 'نظام ولاء متكامل يمنح العملاء نقاطاً عند كل عملية شراء. تتبع سجل كل عميل وإنفاقه وكافئه تلقائياً.',
        features: [
            { icon: Zap,           title: 'منح النقاط تلقائياً',      desc: 'نقاط عند كل دفعة بمعدل قابل للتخصيص' },
            { icon: Users,         title: 'سجل العملاء',              desc: 'نقاط وإنفاق وزيارات وتاريخ كل عميل' },
            { icon: Award,         title: 'أفضل العملاء',             desc: 'ترتيب العملاء حسب الإنفاق والولاء' },
            { icon: Gift,          title: 'المكافآت',                 desc: 'خصومات وهدايا مقابل استبدال النقاط' },
            { icon: Heart,         title: 'تحفيز العودة',              desc: 'تتبع تكرار الزيارات وتحفيز العملاء الخاملين' },
            { icon: DollarSign,    title: 'تكامل الكاشير',            desc: 'منح النقاط وخصمها لحظياً عند الدفع' },
        ],
    },
    {
        id: 'ai',
        gradient: 'from-yellow-500 via-orange-500 to-red-500',
        glow: 'rgba(234,179,8,0.6)',
        accent: 'text-yellow-400',
        overlay: 'from-yellow-950/30 via-orange-950/20 to-transparent',
        borderAccent: 'border-yellow-500/30',
        icon: Bot,
        sidebarIcon: Bot,
        category: 'الذكاء الاصطناعي',
        title: 'مستشارك الذكي يعمل 24/7',
        subtitle: 'تحليل وتوصيات بأرقام حقيقية',
        description: 'اسأل مساعدك الذكي بالعربية عن أي شيء — "ما ربح هذا الأسبوع؟"، "أي صنف يستحق التطوير؟" — ويجيبك فوراً بأرقام حقيقية من بياناتك.',
        features: [
            { icon: Activity,      title: 'بيانات حقيقية',            desc: 'الردود مستندة إلى بيانات مطعمك فعلياً' },
            { icon: TrendingUp,    title: 'مقارنة تلقائية',           desc: 'مقارنة مع أمس والأسبوع الماضي تلقائياً ✅' },
            { icon: AlertTriangle, title: 'تنبيهات استباقية',          desc: 'تنبيه بانخفاض المبيعات أو نفاد المخزون' },
            { icon: Lightbulb,     title: 'توصيات عملية',             desc: 'اقتراحات قابلة للتطبيق فوراً لرفع الأرباح' },
            { icon: MessageSquare, title: 'محادثة طبيعية',            desc: 'اسأل بالعربية وخذ إجابة مباشرة وسريعة' },
            { icon: Cpu,           title: 'GPT-4 وGemini',            desc: 'اختر مزودك المفضل من ملف الإعدادات' },
        ],
    },
    {
        id: 'settings',
        gradient: 'from-slate-600 via-gray-500 to-zinc-500',
        glow: 'rgba(71,85,105,0.6)',
        accent: 'text-slate-400',
        overlay: 'from-slate-900/50 via-gray-900/30 to-transparent',
        borderAccent: 'border-slate-500/30',
        icon: Settings,
        sidebarIcon: Settings,
        category: 'الإعدادات والفريق',
        title: 'النظام يتكيف مع مطعمك',
        subtitle: 'إعدادات، فريق، فروع، هوية',
        description: 'أعدّ النظام بالكامل حسب احتياجاتك — أضف موظفين بصلاحيات محددة، خصص الهوية التجارية، وأعدّ الفروع ونظام QR Code للطاولات.',
        features: [
            { icon: Users,         title: 'الموظفون والأدوار',        desc: 'إضافة موظفين وتخصيص الصلاحيات بدقة' },
            { icon: Building,      title: 'إدارة الفروع',             desc: 'فروع غير محدودة مع عزل كامل للبيانات' },
            { icon: Palette,       title: 'الهوية التجارية',          desc: 'شعار، ألوان، معلومات المطعم للفواتير' },
            { icon: QrCode,        title: 'QR Code الطاولات',          desc: 'رمز QR مخصص لكل طاولة للطلب الذاتي' },
            { icon: Calculator,    title: 'الضريبة والعملة',           desc: 'إعداد معدلات الضريبة والخدمة والعملة' },
            { icon: Shield,        title: 'الأمان والمصادقة',          desc: 'تسجيل دخول بخطوتين وسجل النشاط' },
        ],
    },
    {
        id: 'ready',
        gradient: 'from-violet-600 via-pink-500 to-orange-500',
        glow: 'rgba(139,92,246,0.6)',
        accent: 'text-violet-400',
        overlay: 'from-violet-950/30 via-pink-950/20 to-transparent',
        borderAccent: 'border-violet-500/30',
        icon: Rocket,
        sidebarIcon: Rocket,
        category: 'ابدأ الآن',
        title: 'أنت جاهز — انطلق الآن! 🚀',
        subtitle: 'دليل البدء السريع في 5 خطوات',
        description: 'كل ما تحتاجه لمطعم ناجح جاهز وفي انتظارك. اتبع هذه الخطوات لتجهيز نظامك بالكامل في أقل من ساعة.',
        features: [
            { icon: Utensils,      title: 'الخطوة 1: القائمة',         desc: 'أضف أصناف قائمة الطعام وأسعارها وصورها' },
            { icon: Armchair,      title: 'الخطوة 2: الطاولات',        desc: 'أعدّ طاولات المطعم وخطة الطابق التفاعلية' },
            { icon: Users,         title: 'الخطوة 3: الفريق',          desc: 'أضف موظفيك وامنحهم صلاحياتهم المناسبة' },
            { icon: Settings,      title: 'الخطوة 4: الإعدادات',       desc: 'فعّل إعدادات الضريبة والعملة والخدمة' },
            { icon: DollarSign,    title: 'الخطوة 5: أول طلب',         desc: 'ابدأ باستقبال أول طلب واستمتع بالنجاح!' },
            { icon: Sparkles,      title: 'المساعد الذكي',              desc: 'فعّل مفتاح AI لتحليل أداء مطعمك تلقائياً' },
        ],
    },
];

// ─── Sidebar Item ─────────────────────────────────────────────────────────────

function SidebarItem({
    step, index, currentIndex, isCompleted, onClick,
}: {
    step: TourStep; index: number; currentIndex: number; isCompleted: boolean; onClick: () => void;
}) {
    const isCurrent = index === currentIndex;
    const isFuture = index > currentIndex && !isCompleted;
    const Icon = step.sidebarIcon;

    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all duration-200',
                isCurrent && 'bg-white/10 shadow-sm',
                !isCurrent && 'hover:bg-white/5',
                isFuture && 'opacity-40',
            )}
        >
            {/* Number / check */}
            <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                isCompleted && 'bg-green-500/20 text-green-400',
                isCurrent && cn('bg-gradient-to-br', step.gradient, 'text-white'),
                isFuture && 'bg-white/10 text-white/40',
            )}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
            </div>

            {/* Icon + name */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isCurrent ? step.accent : 'text-white/50')} />
                <span className={cn(
                    'text-xs truncate',
                    isCurrent ? 'text-white font-semibold' : isCompleted ? 'text-white/70' : 'text-white/40',
                )}>
                    {step.category}
                </span>
            </div>
        </button>
    );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({ feat, step }: { feat: Feature; step: TourStep }) {
    const FIcon = feat.icon;
    return (
        <div className={cn(
            'rounded-2xl p-4 border bg-white/5 backdrop-blur-sm transition-all duration-200 hover:bg-white/8',
            step.borderAccent,
        )}>
            <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center mb-3',
                'bg-gradient-to-br', step.gradient, 'opacity-90',
            )}>
                <FIcon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
            </div>
            <p className="text-white font-semibold text-sm mb-1 leading-snug">{feat.title}</p>
            <p className="text-white/55 text-xs leading-relaxed">{feat.desc}</p>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SystemTour() {
    const [visible, setVisible] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [completed, setCompleted] = useState<number[]>([]);
    const [animKey, setAnimKey] = useState(0);
    const [direction, setDirection] = useState<'fwd' | 'bwd'>('fwd');
    const contentRef = useRef<HTMLDivElement>(null);

    const total = STEPS.length;
    const current = STEPS[stepIdx];
    const isFirst = stepIdx === 0;
    const isLast = stepIdx === total - 1;
    const progress = ((stepIdx + 1) / total) * 100;

    // Auto-show on first visit
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!localStorage.getItem(LS_KEY)) {
            const t = setTimeout(() => setVisible(true), 500);
            return () => clearTimeout(t);
        }
    }, []);

    // Restart event listener
    useEffect(() => {
        const handler = () => {
            setStepIdx(0);
            setCompleted([]);
            setAnimKey(k => k + 1);
            setDirection('fwd');
            setVisible(true);
        };
        window.addEventListener('restart-tour', handler);
        return () => window.removeEventListener('restart-tour', handler);
    }, []);

    // Keyboard nav
    useEffect(() => {
        if (!visible) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleDismiss();
            if (e.key === 'ArrowLeft') handleNext();
            if (e.key === 'ArrowRight') handlePrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, stepIdx]);

    const handleDismiss = useCallback(() => {
        localStorage.setItem(LS_KEY, 'true');
        setVisible(false);
    }, []);

    const goTo = useCallback((idx: number) => {
        if (idx === stepIdx) return;
        setDirection(idx > stepIdx ? 'fwd' : 'bwd');
        setCompleted(prev => prev.includes(stepIdx) ? prev : [...prev, stepIdx]);
        setStepIdx(idx);
        setAnimKey(k => k + 1);
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [stepIdx]);

    const handleNext = useCallback(() => {
        if (isLast) { handleDismiss(); return; }
        goTo(stepIdx + 1);
    }, [isLast, stepIdx, goTo, handleDismiss]);

    const handlePrev = useCallback(() => {
        if (!isFirst) goTo(stepIdx - 1);
    }, [isFirst, stepIdx, goTo]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col"
            dir="rtl"
            style={{
                background: 'linear-gradient(135deg, #07071a 0%, #0c0c1e 50%, #0a0818 100%)',
            }}
        >
            {/* Colored overlay per step */}
            <div
                className={cn('absolute inset-0 pointer-events-none bg-gradient-to-br opacity-100 transition-all duration-700', current.overlay)}
            />

            {/* ═══ TOP BAR ═══ */}
            <div className="relative z-10 flex items-center justify-between px-6 h-14 shrink-0 border-b border-white/8">
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="نظام المطعم" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-white font-bold text-sm">نظام المطعم</span>
                </div>

                {/* Current step name */}
                <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">الخطوة {stepIdx + 1} من {total}:</span>
                    <span className={cn('text-xs font-semibold', current.accent)}>{current.category}</span>
                </div>

                {/* Skip */}
                <button
                    onClick={handleDismiss}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors rounded-lg px-3 py-1.5 hover:bg-white/8"
                >
                    <X className="w-3.5 h-3.5" />
                    تخطي الجولة
                </button>
            </div>

            {/* Progress bar */}
            <div className="relative z-10 h-0.5 bg-white/8 shrink-0">
                <div
                    className={cn('h-full bg-gradient-to-l transition-all duration-500 ease-out', current.gradient)}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* ═══ BODY ═══ */}
            <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">

                {/* ── Sidebar (RTL = right side) ── */}
                <div className="w-64 shrink-0 border-l border-white/8 flex flex-col overflow-hidden">
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-white/30 text-[11px] font-medium uppercase tracking-wider">محتوى الجولة</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 scrollbar-hide">
                        {STEPS.map((s, i) => (
                            <SidebarItem
                                key={s.id}
                                step={s}
                                index={i}
                                currentIndex={stepIdx}
                                isCompleted={completed.includes(i)}
                                onClick={() => goTo(i)}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Main content (RTL = left side) ── */}
                <div
                    key={animKey}
                    ref={contentRef}
                    className={cn(
                        'flex-1 overflow-y-auto',
                        'animate-in fade-in duration-300',
                        direction === 'fwd' ? 'slide-in-from-left-6' : 'slide-in-from-right-6',
                    )}
                >
                    {/* Hero zone */}
                    <div className="relative px-10 pt-10 pb-8">
                        {/* Radial glow behind icon */}
                        <div
                            className="absolute top-8 right-10 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none"
                            style={{ background: current.glow }}
                        />

                        <div className="flex items-start gap-8">
                            {/* Icon block */}
                            <div className={cn(
                                'relative w-28 h-28 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-2xl',
                                'bg-gradient-to-br', current.gradient,
                            )}>
                                {(() => { const Icon = current.icon; return <Icon className="w-14 h-14 text-white drop-shadow-lg" />; })()}
                                {/* Glow ring */}
                                <div
                                    className="absolute inset-0 rounded-3xl opacity-50"
                                    style={{ boxShadow: `0 0 40px ${current.glow}` }}
                                />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0 pt-1">
                                <span className={cn('text-xs font-semibold uppercase tracking-widest mb-2 block', current.accent)}>
                                    {current.category}
                                </span>
                                <h1 className="text-3xl font-bold text-white leading-tight mb-2">
                                    {current.title}
                                </h1>
                                <p className={cn('text-base font-medium mb-4', current.accent)}>
                                    {current.subtitle}
                                </p>
                                <p className="text-white/60 text-sm leading-relaxed max-w-xl">
                                    {current.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-10 h-px bg-white/8" />

                    {/* Feature grid */}
                    <div className="px-10 py-8">
                        <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-5">الميزات الرئيسية</p>
                        <div className="grid grid-cols-3 gap-4">
                            {current.features.map((feat, i) => (
                                <FeatureCard key={i} feat={feat} step={current} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ BOTTOM BAR ═══ */}
            <div className="relative z-10 flex items-center justify-between px-6 h-16 shrink-0 border-t border-white/8">
                {/* Prev */}
                <button
                    onClick={handlePrev}
                    disabled={isFirst}
                    className={cn(
                        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isFirst
                            ? 'invisible'
                            : 'text-white/60 hover:text-white hover:bg-white/8 border border-white/10 hover:border-white/20',
                    )}
                >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                </button>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                    {STEPS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={cn(
                                'rounded-full transition-all duration-300',
                                i === stepIdx
                                    ? cn('w-6 h-2 bg-gradient-to-l', current.gradient)
                                    : completed.includes(i)
                                        ? 'w-2 h-2 bg-green-500/60 hover:bg-green-500'
                                        : 'w-2 h-2 bg-white/15 hover:bg-white/30',
                            )}
                        />
                    ))}
                </div>

                {/* Next */}
                <button
                    onClick={handleNext}
                    className={cn(
                        'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                        'bg-gradient-to-l shadow-lg hover:opacity-90 hover:shadow-xl hover:scale-[1.02]',
                        current.gradient,
                    )}
                >
                    {isLast ? (
                        <>
                            <Rocket className="w-4 h-4" />
                            ابدأ الآن
                        </>
                    ) : (
                        <>
                            التالي
                            <ChevronLeft className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
