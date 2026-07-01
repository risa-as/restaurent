-- ============================================================================
-- Row-Level Security (RLS) — عزل المستأجرين على مستوى قاعدة البيانات
-- ============================================================================
-- ⚠️  لا تُشغّل هذا على الإنتاج مباشرة. اقرأ README.md أولاً.
--     يجب أن يكون التطبيق يضبط app.tenant_id بشكل صحيح لكل استعلام (داخل معاملة)
--     قبل تفعيل FORCE، وإلا ستُرجع كل الاستعلامات 0 صفوف ويتعطّل التطبيق.
--
-- ملاحظات الأسماء الفعلية:
--   • العمود هو "tenantId" (camelCase, يحتاج اقتباس مزدوج).
--   • جدول الطلبات اسمه "orders" (lowercase). البقية PascalCase.
-- ============================================================================

-- (1) تفعيل RLS + إنشاء سياسة العزل على كل جدول يملك tenantId
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'AiUsageLog','AuditLog','Bill','Branch','CashierShift','Category',
      'Customer','CustomerFeedback','DailyClose','Expense','InventoryBatch',
      'KitchenStation','ManualPayment','MenuItem','ModifierGroup','Offer',
      'PurchaseOrder','RawMaterial','Reservation','SeasonalMenu','Supplier',
      'SupplierPayment','SystemSetting','Table','TalabatConfig','User',
      'VoidRequest','orders'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- CREATE POLICY لا يدعم IF NOT EXISTS — نحذف ثم ننشئ (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("tenantId" = current_setting(''app.tenant_id'', true))
         WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true))',
      tbl
    );
  END LOOP;
END$$;

-- (2) خطوة منفصلة (لا تُنفَّذ إلا بعد التأكد أن app.tenant_id يُضبط لكل استعلام):
--     FORCE يجعل حتى مالك الجدول خاضعاً لـ RLS (وإلا فالمالك يتجاوزها).
--     شغّلها يدوياً جدولاً جدولاً بعد الاختبار على قاعدة فرع (Neon branch).
--
--   ALTER TABLE "orders"        FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "Bill"          FORCE ROW LEVEL SECURITY;
--   ALTER TABLE "CashierShift"  FORCE ROW LEVEL SECURITY;
--   ... (بقية الجداول)
