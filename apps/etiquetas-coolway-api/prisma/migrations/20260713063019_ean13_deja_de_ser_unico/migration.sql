-- DropIndex
DROP INDEX "reference_ean13_key";

-- CreateIndex
CREATE INDEX "reference_ean13_idx" ON "reference"("ean13");
