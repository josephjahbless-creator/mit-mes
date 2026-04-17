-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itemized_budgets" (
    "id" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountDescription" TEXT NOT NULL,
    "accountClass" TEXT,
    "departmentId" TEXT,
    "unitId" TEXT,
    "institutionId" TEXT,
    "fiscalYear" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "budgetA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fundAllocationB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenditurePrevMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenditureThisMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenditureToDate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commitmentToDate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommitExpendC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fundBalanceBC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetBalanceAB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isOtherCharges" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itemized_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_statistics" (
    "id" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalRegistered" INTEGER NOT NULL DEFAULT 0,
    "operating" INTEGER NOT NULL DEFAULT 0,
    "closed" INTEGER NOT NULL DEFAULT 0,
    "newRegistered" INTEGER NOT NULL DEFAULT 0,
    "region" TEXT,
    "sector" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itemized_budgets" ADD CONSTRAINT "itemized_budgets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itemized_budgets" ADD CONSTRAINT "itemized_budgets_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itemized_budgets" ADD CONSTRAINT "itemized_budgets_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
