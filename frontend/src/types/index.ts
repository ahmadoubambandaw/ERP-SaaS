export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organization?: Organization;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'SALES' | 'INVENTORY_MANAGER' | 'HR_MANAGER' | 'PROJECT_MANAGER' | 'EMPLOYEE';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  language: string;
  logo?: string;
}

export interface Invoice {
  id: string;
  number: string;
  type: 'QUOTE' | 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA';
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  customer: { id: string; name: string; email?: string };
  lines: InvoiceLine[];
  payments: Payment[];
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'COMPANY' | 'INDIVIDUAL';
  city?: string;
  country?: string;
  taxId?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category?: string;
  unitOfMeasure: string;
  costPrice?: number;
  salePrice?: number;
  taxRate: number;
  reorderLevel?: number;
  stockLevels: StockLevel[];
}

export interface StockLevel {
  id: string;
  quantity: number;
  warehouse: { id: string; name: string };
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department?: string;
  position: string;
  employmentType: string;
  baseSalary: number;
  currency: string;
  isActive: boolean;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED';
  estimatedValue?: number;
}

export interface Opportunity {
  id: string;
  name: string;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  probability: number;
  value?: number;
  expectedCloseDate?: string;
  customer: { id: string; name: string };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  budget?: number;
  progress: number;
  _count: { tasks: number; members: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  assignee?: { id: string; firstName: string; lastName: string };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
