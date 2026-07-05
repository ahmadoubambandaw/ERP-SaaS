import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 402 && window.location.pathname !== '/subscription-expired') {
      window.location.href = '/subscription-expired';
      return Promise.reject(error);
    }
    // Module non inclus dans la formule ou limite d'utilisateurs atteinte
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    if (error.response?.status === 403 && (code === 'PLAN_UPGRADE_REQUIRED' || code === 'PLAN_USER_LIMIT')) {
      const msg = (error.response?.data as { error?: string } | undefined)?.error;
      toast(msg || 'Fonctionnalité réservée à un plan supérieur', { icon: '🔒' });
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers!.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const { refreshToken, updateTokens, logout } = useAuthStore.getState();

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
        updateTokens(newAccess, newRefresh);
        processQueue(null, newAccess);
        original.headers!.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        logout();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export const authService = {
  login: (email: string, password: string, organizationSlug: string) =>
    api.post('/auth/login', { email, password, organizationSlug }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/auth/me/password', data),
};

export const dashboardService = {
  kpis: () => api.get('/dashboard/kpis'),
  revenueChart: () => api.get('/dashboard/revenue-chart'),
  recentInvoices: () => api.get('/dashboard/recent-invoices'),
  search: (q: string) => api.get('/dashboard/search', { params: { q } }),
  alerts: () => api.get('/dashboard/alerts'),
};

export const invoicingService = {
  list: (params?: Record<string, string>) => api.get('/invoicing', { params }),
  get: (id: string) => api.get(`/invoicing/${id}`),
  create: (data: unknown) => api.post('/invoicing', data),
  update: (id: string, data: unknown) => api.patch(`/invoicing/${id}`, data),
  send: (id: string) => api.patch(`/invoicing/${id}/send`),
  emailInvoice: (id: string, data: { to: string; message?: string; pdfBase64: string }) =>
    api.post(`/invoicing/${id}/email`, data),
  addPayment: (id: string, data: unknown) => api.post(`/invoicing/${id}/payments`, data),
  delete: (id: string) => api.delete(`/invoicing/${id}`),
  customers: () => api.get('/invoicing/customers'),
  createCustomer: (data: unknown) => api.post('/invoicing/customers', data),
  suppliers: () => api.get('/invoicing/suppliers'),
  createSupplier: (data: unknown) => api.post('/invoicing/suppliers', data),
};

export const inventoryService = {
  products: () => api.get('/inventory/products'),
  createProduct: (data: unknown) => api.post('/inventory/products', data),
  updateProduct: (id: string, data: unknown) => api.patch(`/inventory/products/${id}`, data),
  warehouses: () => api.get('/inventory/warehouses'),
  createWarehouse: (data: unknown) => api.post('/inventory/warehouses', data),
  stockLevels: () => api.get('/inventory/stock-levels'),
  lowStock: () => api.get('/inventory/low-stock'),
  movements: () => api.get('/inventory/movements'),
  createMovement: (data: unknown) => api.post('/inventory/movements', data),
  purchaseOrders: () => api.get('/inventory/purchase-orders'),
  createPurchaseOrder: (data: unknown) => api.post('/inventory/purchase-orders', data),
  confirmPurchaseOrder: (id: string) => api.patch(`/inventory/purchase-orders/${id}/confirm`),
  cancelPurchaseOrder: (id: string) => api.patch(`/inventory/purchase-orders/${id}/cancel`),
  receivePurchaseOrder: (id: string) => api.patch(`/inventory/purchase-orders/${id}/receive`),
};

export const hrService = {
  employees: () => api.get('/hr/employees'),
  createEmployee: (data: unknown) => api.post('/hr/employees', data),
  updateEmployee: (id: string, data: unknown) => api.patch(`/hr/employees/${id}`, data),
  payslips: (period?: string) => api.get('/hr/payslips', { params: { period } }),
  generatePayslips: (period: string) => api.post('/hr/payslips/generate', { period }),
  approvePayslip: (id: string) => api.patch(`/hr/payslips/${id}/approve`),
  leaves: () => api.get('/hr/leaves'),
  createLeave: (data: unknown) => api.post('/hr/leaves', data),
  approveLeave: (id: string) => api.patch(`/hr/leaves/${id}/approve`),
  rejectLeave: (id: string) => api.patch(`/hr/leaves/${id}/reject`),
};

export const organizationService = {
  get: () => api.get('/organization'),
  update: (data: unknown) => api.patch('/organization', data),
};

export const subscriptionService = {
  me: () => api.get('/subscription'),
  organizations: () => api.get('/subscription/organizations'),
  platformStats: () => api.get('/subscription/platform-stats'),
  organizationDetails: (id: string) => api.get(`/subscription/organizations/${id}/details`),
  runReminders: () => api.post('/subscription/run-reminders'),
  updateOrganization: (id: string, data: unknown) => api.patch(`/subscription/organizations/${id}`, data),
};

export const billingService = {
  checkout: () => api.post('/billing/checkout'),
  verify: () => api.post('/billing/verify'),
};

export const usersService = {
  list: () => api.get('/users'),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.patch(`/users/${id}`, data),
  remove: (id: string) => api.delete(`/users/${id}`),
};

export const crmService = {
  leads: () => api.get('/crm/leads'),
  createLead: (data: unknown) => api.post('/crm/leads', data),
  updateLead: (id: string, data: unknown) => api.patch(`/crm/leads/${id}`, data),
  convertLead: (id: string) => api.patch(`/crm/leads/${id}/convert`),
  opportunities: () => api.get('/crm/opportunities'),
  createOpportunity: (data: unknown) => api.post('/crm/opportunities', data),
  updateOpportunity: (id: string, data: unknown) => api.patch(`/crm/opportunities/${id}`, data),
};

export const projectsService = {
  list: () => api.get('/projects'),
  create: (data: unknown) => api.post('/projects', data),
  get: (id: string) => api.get(`/projects/${id}`),
  update: (id: string, data: unknown) => api.patch(`/projects/${id}`, data),
  tasks: (projectId: string) => api.get(`/projects/${projectId}/tasks`),
  createTask: (projectId: string, data: unknown) => api.post(`/projects/${projectId}/tasks`, data),
  updateTask: (projectId: string, id: string, data: unknown) => api.patch(`/projects/${projectId}/tasks/${id}`, data),
};

export const accountingService = {
  accounts: () => api.get('/accounting/accounts'),
  createAccount: (data: unknown) => api.post('/accounting/accounts', data),
  journals: () => api.get('/accounting/journals'),
  createJournal: (data: unknown) => api.post('/accounting/journals', data),
  entries: (params?: Record<string, string>) => api.get('/accounting/entries', { params }),
  createEntry: (data: unknown) => api.post('/accounting/entries', data),
  postEntry: (id: string) => api.patch(`/accounting/entries/${id}/post`),
  deleteEntry: (id: string) => api.delete(`/accounting/entries/${id}`),
  trialBalance: () => api.get('/accounting/reports/trial-balance'),
  ledger: (accountCode: string) => api.get(`/accounting/reports/ledger/${accountCode}`),
};
