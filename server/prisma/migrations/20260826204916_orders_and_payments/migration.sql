-- AlterEnum
BEGIN;
CREATE TYPE "ShippingStatus_new" AS ENUM ('processing', 'shipped', 'inTransit', 'delivered');
ALTER TABLE "public"."Order" ALTER COLUMN "shippingStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "shippingStatus" TYPE "ShippingStatus_new" USING ("shippingStatus"::text::"ShippingStatus_new");
ALTER TYPE "ShippingStatus" RENAME TO "ShippingStatus_old";
ALTER TYPE "ShippingStatus_new" RENAME TO "ShippingStatus";
DROP TYPE "public"."ShippingStatus_old";
ALTER TABLE "Order" ALTER COLUMN "shippingStatus" SET DEFAULT 'processing';
COMMIT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "amount",
ADD COLUMN     "buyerPremium" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpayPaymentId" TEXT,
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "winningBid" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "shippingStatus" SET DEFAULT 'processing';

