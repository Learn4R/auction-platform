-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingAddressLine1" TEXT,
ADD COLUMN     "shippingAddressLine2" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingName" TEXT,
ADD COLUMN     "shippingPhone" TEXT,
ADD COLUMN     "shippingPincode" TEXT,
ADD COLUMN     "shippingState" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultShippingAddressLine1" TEXT,
ADD COLUMN     "defaultShippingAddressLine2" TEXT,
ADD COLUMN     "defaultShippingCity" TEXT,
ADD COLUMN     "defaultShippingName" TEXT,
ADD COLUMN     "defaultShippingPhone" TEXT,
ADD COLUMN     "defaultShippingPincode" TEXT,
ADD COLUMN     "defaultShippingState" TEXT;
