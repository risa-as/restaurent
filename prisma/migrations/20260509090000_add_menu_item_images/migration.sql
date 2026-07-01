ALTER TABLE "MenuItem"
ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "MenuItem"
SET "images" = CASE
    WHEN "image" IS NULL OR "image" = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY["image"]
END;

ALTER TABLE "MenuItem"
ALTER COLUMN "images" SET NOT NULL;
