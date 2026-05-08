-- CreateTable
CREATE TABLE "system_insights" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "indicatorId" TEXT,
    "actualId" TEXT,
    "institutionId" TEXT,
    "fiscalYear" TEXT,
    "period" TEXT,
    "insightType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "headline" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "target" DOUBLE PRECISION,
    "previousValue" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "system_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_insights_scope_fiscalYear_period_idx" ON "system_insights"("scope", "fiscalYear", "period");

-- CreateIndex
CREATE INDEX "system_insights_indicatorId_idx" ON "system_insights"("indicatorId");

-- CreateIndex
CREATE INDEX "system_insights_actualId_idx" ON "system_insights"("actualId");

-- CreateIndex
CREATE INDEX "system_insights_institutionId_fiscalYear_idx" ON "system_insights"("institutionId", "fiscalYear");

-- AddForeignKey
ALTER TABLE "system_insights" ADD CONSTRAINT "system_insights_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_insights" ADD CONSTRAINT "system_insights_actualId_fkey" FOREIGN KEY ("actualId") REFERENCES "indicator_actuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_insights" ADD CONSTRAINT "system_insights_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
