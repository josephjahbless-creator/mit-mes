-- CreateIndex
CREATE INDEX "indicator_actuals_institutionId_fiscalYear_status_idx" ON "indicator_actuals"("institutionId", "fiscalYear", "status");

-- CreateIndex
CREATE INDEX "indicator_actuals_status_fiscalYear_idx" ON "indicator_actuals"("status", "fiscalYear");

-- CreateIndex
CREATE INDEX "indicator_actuals_fiscalYear_reportingPeriod_idx" ON "indicator_actuals"("fiscalYear", "reportingPeriod");

-- CreateIndex
CREATE INDEX "indicator_actuals_submittedById_idx" ON "indicator_actuals"("submittedById");
