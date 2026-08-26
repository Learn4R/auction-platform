-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "proposedBidIncrement" DECIMAL(10,2),
ADD COLUMN     "proposedEndTime" TIMESTAMP(3),
ADD COLUMN     "proposedStartTime" TIMESTAMP(3),
ADD COLUMN     "proposedStartingBid" DECIMAL(10,2),
ADD COLUMN     "rejectionReason" TEXT;
