-- ============================================================
-- ERP SaaS pour PME Africaines — Migration initiale
-- ============================================================

-- ENUMS
CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'SALES', 'INVENTORY_MANAGER', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE');
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE "JournalType" AS ENUM ('SALES', 'PURCHASES', 'BANK', 'CASH', 'GENERAL', 'PAYROLL');
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE "InvoiceType" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'PROFORMA');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHECK', 'CARD');
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER');
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'VALIDATED', 'PAID');
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'PHONE', 'EVENT', 'OTHER');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED');
CREATE TYPE "OpportunityStage" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- TABLES

-- Organization
CREATE TABLE "Organization" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"        TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "plan"        "Plan" NOT NULL DEFAULT 'FREE',
  "country"     TEXT NOT NULL DEFAULT 'SN',
  "currency"    TEXT NOT NULL DEFAULT 'XOF',
  "taxId"       TEXT,
  "address"     TEXT,
  "phone"       TEXT,
  "email"       TEXT,
  "logo"        TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- User
CREATE TABLE "User" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "passwordHash"   TEXT NOT NULL,
  "firstName"      TEXT NOT NULL,
  "lastName"       TEXT NOT NULL,
  "role"           "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
  "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
  "lastLoginAt"    TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- RefreshToken
CREATE TABLE "RefreshToken" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"      TEXT NOT NULL,
  "token"       TEXT NOT NULL,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "revokedAt"   TIMESTAMPTZ,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- Account (Plan Comptable SYSCOHADA)
CREATE TABLE "Account" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "code"           TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "type"           "AccountType" NOT NULL,
  "parentId"       TEXT,
  "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Account_organizationId_code_key" ON "Account"("organizationId", "code");
CREATE INDEX "Account_organizationId_idx" ON "Account"("organizationId");

-- Journal
CREATE TABLE "Journal" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "code"           TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "type"           "JournalType" NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Journal_organizationId_code_key" ON "Journal"("organizationId", "code");
CREATE INDEX "Journal_organizationId_idx" ON "Journal"("organizationId");

-- JournalEntry
CREATE TABLE "JournalEntry" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "journalId"      TEXT NOT NULL,
  "entryNumber"    TEXT NOT NULL,
  "date"           DATE NOT NULL,
  "description"    TEXT NOT NULL,
  "status"         "EntryStatus" NOT NULL DEFAULT 'DRAFT',
  "reference"      TEXT,
  "createdById"    TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JournalEntry_organizationId_entryNumber_key" ON "JournalEntry"("organizationId", "entryNumber");
CREATE INDEX "JournalEntry_organizationId_idx" ON "JournalEntry"("organizationId");
CREATE INDEX "JournalEntry_journalId_idx" ON "JournalEntry"("journalId");

-- JournalLine
CREATE TABLE "JournalLine" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "entryId"     TEXT NOT NULL,
  "accountId"   TEXT NOT NULL,
  "debit"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "credit"      DECIMAL(15,2) NOT NULL DEFAULT 0,
  "description" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JournalLine_entryId_idx" ON "JournalLine"("entryId");
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- Customer
CREATE TABLE "Customer" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "type"           "CustomerType" NOT NULL DEFAULT 'COMPANY',
  "name"           TEXT NOT NULL,
  "email"          TEXT,
  "phone"          TEXT,
  "address"        TEXT,
  "taxId"          TEXT,
  "creditLimit"    DECIMAL(15,2) NOT NULL DEFAULT 0,
  "balance"        DECIMAL(15,2) NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

-- Supplier
CREATE TABLE "Supplier" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "email"          TEXT,
  "phone"          TEXT,
  "address"        TEXT,
  "taxId"          TEXT,
  "balance"        DECIMAL(15,2) NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Supplier_organizationId_idx" ON "Supplier"("organizationId");

-- Invoice
CREATE TABLE "Invoice" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "customerId"     TEXT NOT NULL,
  "type"           "InvoiceType" NOT NULL DEFAULT 'INVOICE',
  "status"         "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "invoiceNumber"  TEXT NOT NULL,
  "issueDate"      DATE NOT NULL,
  "dueDate"        DATE NOT NULL,
  "subtotal"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "taxAmount"      DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total"          DECIMAL(15,2) NOT NULL DEFAULT 0,
  "amountPaid"     DECIMAL(15,2) NOT NULL DEFAULT 0,
  "notes"          TEXT,
  "currency"       TEXT NOT NULL DEFAULT 'XOF',
  "createdById"    TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key" ON "Invoice"("organizationId", "invoiceNumber");
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- InvoiceLine
CREATE TABLE "InvoiceLine" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "invoiceId"   TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity"    DECIMAL(10,3) NOT NULL,
  "unitPrice"   DECIMAL(15,2) NOT NULL,
  "taxRate"     DECIMAL(5,2) NOT NULL DEFAULT 0,
  "total"       DECIMAL(15,2) NOT NULL,
  "productId"   TEXT,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- Payment
CREATE TABLE "Payment" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "invoiceId"      TEXT NOT NULL,
  "amount"         DECIMAL(15,2) NOT NULL,
  "method"         "PaymentMethod" NOT NULL,
  "reference"      TEXT,
  "paidAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "notes"          TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- Product
CREATE TABLE "Product" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "sku"            TEXT,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "category"       TEXT,
  "unitPrice"      DECIMAL(15,2) NOT NULL DEFAULT 0,
  "costPrice"      DECIMAL(15,2) NOT NULL DEFAULT 0,
  "taxRate"        DECIMAL(5,2) NOT NULL DEFAULT 18,
  "isService"      BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");

-- Warehouse
CREATE TABLE "Warehouse" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "address"        TEXT,
  "isDefault"      BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Warehouse_organizationId_idx" ON "Warehouse"("organizationId");

-- StockLevel
CREATE TABLE "StockLevel" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "productId"   TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "quantity"    DECIMAL(10,3) NOT NULL DEFAULT 0,
  "minQuantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StockLevel_productId_warehouseId_key" ON "StockLevel"("productId", "warehouseId");

-- StockMovement
CREATE TABLE "StockMovement" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId"  TEXT NOT NULL,
  "productId"       TEXT NOT NULL,
  "warehouseId"     TEXT NOT NULL,
  "type"            "MovementType" NOT NULL,
  "quantity"        DECIMAL(10,3) NOT NULL,
  "unitCost"        DECIMAL(15,2),
  "reference"       TEXT,
  "notes"           TEXT,
  "createdById"     TEXT NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockMovement_organizationId_idx" ON "StockMovement"("organizationId");
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- PurchaseOrder
CREATE TABLE "PurchaseOrder" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "supplierId"     TEXT NOT NULL,
  "poNumber"       TEXT NOT NULL,
  "status"         "POStatus" NOT NULL DEFAULT 'DRAFT',
  "orderDate"      DATE NOT NULL,
  "expectedDate"   DATE,
  "total"          DECIMAL(15,2) NOT NULL DEFAULT 0,
  "notes"          TEXT,
  "createdById"    TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseOrder_organizationId_poNumber_key" ON "PurchaseOrder"("organizationId", "poNumber");
CREATE INDEX "PurchaseOrder_organizationId_idx" ON "PurchaseOrder"("organizationId");

-- PurchaseOrderLine
CREATE TABLE "PurchaseOrderLine" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "poId"        TEXT NOT NULL,
  "productId"   TEXT NOT NULL,
  "description" TEXT,
  "quantity"    DECIMAL(10,3) NOT NULL,
  "unitPrice"   DECIMAL(15,2) NOT NULL,
  "total"       DECIMAL(15,2) NOT NULL,
  "received"    DECIMAL(10,3) NOT NULL DEFAULT 0,
  CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PurchaseOrderLine_poId_idx" ON "PurchaseOrderLine"("poId");

-- Employee
CREATE TABLE "Employee" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId"   TEXT NOT NULL,
  "userId"           TEXT,
  "employeeNumber"   TEXT NOT NULL,
  "firstName"        TEXT NOT NULL,
  "lastName"         TEXT NOT NULL,
  "email"            TEXT NOT NULL,
  "phone"            TEXT,
  "gender"           "Gender",
  "birthDate"        DATE,
  "hireDate"         DATE NOT NULL,
  "endDate"          DATE,
  "department"       TEXT,
  "position"         TEXT NOT NULL,
  "employmentType"   "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
  "baseSalary"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "currency"         TEXT NOT NULL DEFAULT 'XOF',
  "isActive"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Employee_organizationId_employeeNumber_key" ON "Employee"("organizationId", "employeeNumber");
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- Payslip
CREATE TABLE "Payslip" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "employeeId"     TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "period"         TEXT NOT NULL,
  "baseSalary"     DECIMAL(15,2) NOT NULL,
  "allowances"     DECIMAL(15,2) NOT NULL DEFAULT 0,
  "deductions"     DECIMAL(15,2) NOT NULL DEFAULT 0,
  "netSalary"      DECIMAL(15,2) NOT NULL,
  "status"         "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
  "paidAt"         TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");
CREATE INDEX "Payslip_organizationId_idx" ON "Payslip"("organizationId");

-- LeaveRequest
CREATE TABLE "LeaveRequest" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "employeeId"  TEXT NOT NULL,
  "type"        "LeaveType" NOT NULL,
  "startDate"   DATE NOT NULL,
  "endDate"     DATE NOT NULL,
  "days"        INTEGER NOT NULL,
  "reason"      TEXT,
  "status"      "LeaveStatus" NOT NULL DEFAULT 'PENDING',
  "approvedById" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

-- Lead
CREATE TABLE "Lead" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "firstName"      TEXT NOT NULL,
  "lastName"       TEXT NOT NULL,
  "email"          TEXT,
  "phone"          TEXT,
  "company"        TEXT,
  "source"         "LeadSource" NOT NULL DEFAULT 'OTHER',
  "status"         "LeadStatus" NOT NULL DEFAULT 'NEW',
  "assignedToId"   TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- Opportunity
CREATE TABLE "Opportunity" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "customerId"     TEXT,
  "leadId"         TEXT,
  "name"           TEXT NOT NULL,
  "stage"          "OpportunityStage" NOT NULL DEFAULT 'PROSPECTING',
  "amount"         DECIMAL(15,2) NOT NULL DEFAULT 0,
  "probability"    INTEGER NOT NULL DEFAULT 0,
  "expectedClose"  DATE,
  "assignedToId"   TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");

-- Activity
CREATE TABLE "Activity" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId"  TEXT NOT NULL,
  "type"            "ActivityType" NOT NULL,
  "subject"         TEXT NOT NULL,
  "notes"           TEXT,
  "dueDate"         TIMESTAMPTZ,
  "completedAt"     TIMESTAMPTZ,
  "customerId"      TEXT,
  "leadId"          TEXT,
  "opportunityId"   TEXT,
  "assignedToId"    TEXT NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");

-- Project
CREATE TABLE "Project" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organizationId" TEXT NOT NULL,
  "customerId"     TEXT,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "status"         "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
  "priority"       "Priority" NOT NULL DEFAULT 'MEDIUM',
  "startDate"      DATE,
  "endDate"        DATE,
  "budget"         DECIMAL(15,2),
  "createdById"    TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- ProjectMember
CREATE TABLE "ProjectMember" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "projectId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "role"      TEXT NOT NULL DEFAULT 'MEMBER',
  "joinedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- Task
CREATE TABLE "Task" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "projectId"    TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "description"  TEXT,
  "status"       "TaskStatus" NOT NULL DEFAULT 'TODO',
  "priority"     "Priority" NOT NULL DEFAULT 'MEDIUM',
  "assigneeId"   TEXT,
  "dueDate"      DATE,
  "completedAt"  TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- Milestone
CREATE TABLE "Milestone" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "projectId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "dueDate"     DATE NOT NULL,
  "completedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- FOREIGN KEYS
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account"("id") ON DELETE SET NULL;
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id");
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id");
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id");
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id");
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id");
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE;
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id");
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id");
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id");
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id");
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL;
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id");
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;
