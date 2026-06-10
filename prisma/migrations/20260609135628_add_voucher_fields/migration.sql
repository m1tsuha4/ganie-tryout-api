-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "expired_date" TIMESTAMP(3),
ADD COLUMN     "voucher_code" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "voucher_code" TEXT;
