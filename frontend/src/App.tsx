import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import DashboardPage from './pages/dashboard/Dashboard';
import InvoicesPage from './pages/invoicing/Invoices';
import InvoiceFormPage from './pages/invoicing/InvoiceForm';
import InvoiceDetailPage from './pages/invoicing/InvoiceDetail';
import CustomersPage from './pages/invoicing/Customers';
import ProductsPage from './pages/inventory/Products';
import StockMovementsPage from './pages/inventory/StockMovements';
import EmployeesPage from './pages/hr/Employees';
import PayrollPage from './pages/hr/Payroll';
import LeadsPage from './pages/crm/Leads';
import OpportunitiesPage from './pages/crm/Opportunities';
import ProjectsPage from './pages/projects/Projects';
import ProjectDetailPage from './pages/projects/ProjectDetail';
import AccountingPage from './pages/accounting/Accounting';
import SettingsPage from './pages/settings/Settings';
import WarehousesPage from './pages/inventory/Warehouses';
import LeavesPage from './pages/hr/Leaves';
import SuppliersPage from './pages/purchasing/Suppliers';
import PurchaseOrdersPage from './pages/purchasing/PurchaseOrders';
import LandingPage from './pages/public/Landing';
import SubscriptionExpiredPage from './pages/subscription/SubscriptionExpired';
import PlatformAdminPage from './pages/admin/PlatformAdmin';
import BillingReturnPage from './pages/billing/BillingReturn';
import POSPage from './pages/pos/POS';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Landing page for visitors, dashboard for logged-in users
function HomeGate() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeGate />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/subscription-expired"
          element={
            <PrivateRoute>
              <SubscriptionExpiredPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/return"
          element={
            <PrivateRoute>
              <BillingReturnPage />
            </PrivateRoute>
          }
        />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pos" element={<POSPage />} />

          <Route path="invoicing">
            <Route index element={<InvoicesPage />} />
            <Route path="new" element={<InvoiceFormPage />} />
            <Route path=":id" element={<InvoiceDetailPage />} />
            <Route path=":id/edit" element={<InvoiceFormPage />} />
            <Route path="customers" element={<CustomersPage />} />
          </Route>

          <Route path="inventory">
            <Route index element={<ProductsPage />} />
            <Route path="movements" element={<StockMovementsPage />} />
            <Route path="warehouses" element={<WarehousesPage />} />
          </Route>

          <Route path="purchasing">
            <Route index element={<PurchaseOrdersPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
          </Route>

          <Route path="hr">
            <Route index element={<EmployeesPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="leaves" element={<LeavesPage />} />
          </Route>

          <Route path="crm">
            <Route index element={<LeadsPage />} />
            <Route path="opportunities" element={<OpportunitiesPage />} />
          </Route>

          <Route path="projects">
            <Route index element={<ProjectsPage />} />
            <Route path=":id" element={<ProjectDetailPage />} />
          </Route>

          <Route path="accounting" element={<AccountingPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<PlatformAdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
