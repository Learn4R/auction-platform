-- Move existing 'pending' items to 'submitted' now that the value exists
-- (added and committed by the previous migration).
UPDATE "Item" SET "status" = 'submitted' WHERE "status" = 'pending';

-- Recreate the enum without the retired 'pending' value.
CREATE TYPE "ItemStatus_new" AS ENUM ('draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected');
ALTER TABLE "Item" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Item" ALTER COLUMN "status" TYPE "ItemStatus_new" USING ("status"::text::"ItemStatus_new");
ALTER TYPE "ItemStatus" RENAME TO "ItemStatus_old";
ALTER TYPE "ItemStatus_new" RENAME TO "ItemStatus";
DROP TYPE "ItemStatus_old";
ALTER TABLE "Item" ALTER COLUMN "status" SET DEFAULT 'draft';

-- New note field alongside the existing rejection reason, and relax the
-- fields a draft may not have filled in yet.
ALTER TABLE "Item" DROP CONSTRAINT "Item_categoryId_fkey";
ALTER TABLE "Item" ADD COLUMN "changesRequestedNote" TEXT,
  ALTER COLUMN "title" DROP NOT NULL,
  ALTER COLUMN "description" DROP NOT NULL,
  ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
