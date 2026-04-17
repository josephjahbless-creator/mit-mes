-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'admin', 'me_officer', 'data_collector', 'viewer');

-- CreateEnum
CREATE TYPE "ReportingFrequency" AS ENUM ('quarterly', 'annual');

-- CreateEnum
CREATE TYPE "ReportingPeriod" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4', 'Annual');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "FormulaType" AS ENUM ('achievement_pct', 'cumulative_total', 'proportion_pct', 'complement_pct', 'multi_input', 'manual');

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "region" TEXT,
    "contactEmail" TEXT,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_objectives" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcomes" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outputs" (
    "id" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "outputId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicators" (
    "id" TEXT NOT NULL,
    "outputId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "dataSource" TEXT,
    "formulaType" "FormulaType" NOT NULL DEFAULT 'achievement_pct',
    "formulaConfig" JSONB,
    "responsiblePerson" TEXT,
    "reportingFrequency" "ReportingFrequency" NOT NULL DEFAULT 'quarterly',
    "baselineValue" DOUBLE PRECISION,
    "baselineYear" INTEGER,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_targets" (
    "id" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "q1Target" DOUBLE PRECISION,
    "q2Target" DOUBLE PRECISION,
    "q3Target" DOUBLE PRECISION,
    "q4Target" DOUBLE PRECISION,
    "annualTarget" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicator_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_actuals" (
    "id" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "reportingPeriod" "ReportingPeriod" NOT NULL,
    "actualValue" DOUBLE PRECISION,
    "extraFields" JSONB,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicator_actuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_plans" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "q1Budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "q2Budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "q3Budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "q4Budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fundingSource" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenditures" (
    "id" TEXT NOT NULL,
    "budgetPlanId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "period" "ReportingPeriod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "evidenceUrl" TEXT,
    "submittedById" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenditures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "period" "ReportingPeriod" NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT,
    "changes" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_code_key" ON "institutions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_apiKey_key" ON "institutions"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "indicators_code_key" ON "indicators"("code");

-- CreateIndex
CREATE UNIQUE INDEX "indicator_targets_indicatorId_institutionId_fiscalYear_key" ON "indicator_targets"("indicatorId", "institutionId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "indicator_actuals_indicatorId_institutionId_fiscalYear_repo_key" ON "indicator_actuals"("indicatorId", "institutionId", "fiscalYear", "reportingPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "budget_plans_activityId_institutionId_fiscalYear_key" ON "budget_plans"("activityId", "institutionId", "fiscalYear");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "outputs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_targets" ADD CONSTRAINT "indicator_targets_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_targets" ADD CONSTRAINT "indicator_targets_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_actuals" ADD CONSTRAINT "indicator_actuals_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_actuals" ADD CONSTRAINT "indicator_actuals_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_actuals" ADD CONSTRAINT "indicator_actuals_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_actuals" ADD CONSTRAINT "indicator_actuals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "budget_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_forms" ADD CONSTRAINT "data_forms_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "data_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
