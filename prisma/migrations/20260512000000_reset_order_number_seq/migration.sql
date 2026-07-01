-- Reset the orderNumber sequence to be above the current maximum value.
-- This fixes the unique constraint violation caused by the QR order route
-- manually inserting orderNumber values without advancing the sequence.
-- Table is "orders", sequence is "orders_orderNumber_seq".
DO $$
DECLARE
  max_val BIGINT;
BEGIN
  SELECT COALESCE(MAX("orderNumber"), 0) INTO max_val FROM orders;
  PERFORM setval('"orders_orderNumber_seq"', GREATEST(max_val, 1), max_val > 0);
END $$;
