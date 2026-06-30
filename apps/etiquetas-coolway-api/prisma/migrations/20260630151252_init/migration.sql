-- CreateTable
CREATE TABLE "reference" (
    "id" SERIAL NOT NULL,
    "style" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "ean13" TEXT,
    "upc" TEXT,
    "color_name_web" TEXT,
    "season" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reference_ean13_key" ON "reference"("ean13");

-- CreateIndex
CREATE INDEX "reference_style_color_idx" ON "reference"("style", "color");

-- CreateIndex
CREATE UNIQUE INDEX "reference_ref_size_key" ON "reference"("ref", "size");
