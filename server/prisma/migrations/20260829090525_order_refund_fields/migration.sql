-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "razorpayRefundId" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
