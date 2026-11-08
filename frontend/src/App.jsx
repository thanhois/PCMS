import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

// Layouts & Route Guards
import AdminLayout from './components/admin/AdminLayout';
import AdminRouteGuard from './components/admin/AdminRouteGuard';
import ReceptionistLayout from './components/receptionist/ReceptionistLayout';
import ReceptionistRouteGuard from './components/receptionist/ReceptionistRouteGuard';
import VetLayout from './components/vet/VetLayout';
import VetRouteGuard from './components/vet/VetRouteGuard';
import InventoryLayout from './components/inventory/InventoryLayout';
import InventoryRouteGuard from './components/inventory/InventoryRouteGuard';
import BillingLayout from './components/billing/BillingLayout';
import BillingRouteGuard from './components/billing/BillingRouteGuard';
import PetOwnerLayout from './components/owner/PetOwnerLayout';
import PetOwnerRouteGuard from './components/owner/PetOwnerRouteGuard';

// Context
import { AuthProvider } from './context/AuthContext';

// Public Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';

// Admin Pages
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminAccountsPage from './pages/admin/AdminAccountsPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminServicesPage from './pages/admin/AdminServicesPage';
import AdminMedicinesPage from './pages/admin/AdminMedicinesPage';

// Receptionist Pages
import ReceptionistDashboardPage from './pages/receptionist/ReceptionistDashboardPage';
import ReceptionistAppointmentsPage from './pages/receptionist/ReceptionistAppointmentsPage';
import ReceptionistCheckInPage from './pages/receptionist/ReceptionistCheckInPage';
import ReceptionistCustomersPage from './pages/receptionist/ReceptionistCustomersPage';
import ReceptionistServicesPage from './pages/receptionist/ReceptionistServicesPage';

// Vet Pages
import VetWorkbenchPage from './pages/vet/VetWorkbenchPage';
import VetExaminationPage from './pages/vet/VetExaminationPage';
import VetRecordsPage from './pages/vet/VetRecordsPage';
import VetPetsPage from './pages/vet/VetPetsPage';

// Pet Owner Pages
import BookingPage from './pages/owner/BookingPage';
import PetOwnerHomePage from './pages/owner/PetOwnerHomePage';
import PetOwnerMedicalPage from './pages/owner/PetOwnerMedicalPage';
import PetOwnerInvoicesPage from './pages/owner/PetOwnerInvoicesPage';
import PetOwnerInvoiceDetailPage from './pages/owner/PetOwnerInvoiceDetailPage';

// Inventory Pages
import InventoryBatchesPage from './pages/inventory/InventoryBatchesPage';
import InventoryMedicinesPage from './pages/inventory/InventoryMedicinesPage';
import InventoryServicesPage from './pages/inventory/InventoryServicesPage';
import InventoryReportsPage from './pages/inventory/InventoryReportsPage';

// Billing Pages
import BillingDashboardPage from './pages/billing/BillingDashboardPage';
import BillingQueuePage from './pages/billing/BillingQueuePage';
import CreateInvoicePage from './pages/billing/CreateInvoicePage';
import InvoiceManagementPage from './pages/billing/InvoiceManagementPage';
import InvoiceDetailPage from './pages/billing/InvoiceDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/booking" element={<Navigate to="/owner/booking" replace />} />

          {/* ================= ADMIN ROUTES ================= */}
          <Route path="/admin" element={<AdminRouteGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AdminOverviewPage />} />
              <Route path="accounts" element={<AdminAccountsPage />} />
              <Route path="roles" element={<AdminRolesPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="medicines" element={<AdminMedicinesPage />} />
              <Route path="batches" element={<InventoryBatchesPage />} />
              <Route path="inventory" element={<Navigate to="batches" replace />} />
              <Route path="billing" element={<BillingQueuePage />} />
              <Route path="billing/queue" element={<BillingQueuePage />} />
              <Route path="billing/dashboard" element={<BillingDashboardPage />} />
              <Route path="billing/create" element={<CreateInvoicePage />} />
              <Route path="billing/invoices" element={<InvoiceManagementPage />} />
              <Route path="billing/invoices/:invoiceId" element={<InvoiceDetailPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            </Route>
          </Route>

          {/* ================= RECEPTIONIST ROUTES ================= */}
          <Route path="/receptionist" element={<ReceptionistRouteGuard />}>
            <Route element={<ReceptionistLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ReceptionistDashboardPage />} />
              <Route path="appointments" element={<ReceptionistAppointmentsPage />} />
              <Route path="checkin" element={<ReceptionistCheckInPage />} />
              <Route path="customers" element={<ReceptionistCustomersPage />} />
              <Route path="services" element={<ReceptionistServicesPage />} />
            </Route>
          </Route>

          {/* ================= VET ROUTES ================= */}
          <Route path="/vet" element={<VetRouteGuard />}>
            <Route element={<VetLayout />}>
              <Route index element={<Navigate to="workbench" replace />} />
              <Route path="workbench" element={<VetWorkbenchPage />} />
              <Route path="examination/:recordId" element={<VetExaminationPage />} />
              <Route path="records" element={<VetRecordsPage />} />
              <Route path="pets" element={<VetPetsPage />} />
            </Route>
          </Route>

          {/* ================= INVENTORY ROUTES ================= */}
          <Route path="/inventory" element={<InventoryRouteGuard />}>
            <Route element={<InventoryLayout />}>
              <Route index element={<Navigate to="batches" replace />} />
              <Route path="batches" element={<InventoryBatchesPage />} />
              <Route path="medicines" element={<InventoryMedicinesPage />} />
              <Route path="services" element={<InventoryServicesPage />} />
              <Route path="reports" element={<InventoryReportsPage />} />
            </Route>
          </Route>

          {/* ================= BILLING ROUTES ================= */}
          <Route path="/billing" element={<BillingRouteGuard />}>
            <Route element={<BillingLayout />}>
              <Route index element={<BillingDashboardPage />} />
              <Route path="queue" element={<BillingQueuePage />} />
              <Route path="create" element={<CreateInvoicePage />} />
              <Route path="invoices" element={<InvoiceManagementPage />} />
              <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
            </Route>
          </Route>

          {/* ================= PET OWNER ROUTES ================= */}
          <Route path="/owner" element={<PetOwnerRouteGuard />}>
            <Route element={<PetOwnerLayout />}>
              <Route index element={<PetOwnerHomePage />} />
              <Route path="booking" element={<BookingPage />} />
              <Route path="medical-history" element={<PetOwnerMedicalPage />} />
              <Route path="invoices" element={<PetOwnerInvoicesPage />} />
              <Route path="invoices/:invoiceId" element={<PetOwnerInvoiceDetailPage />} />
            </Route>
          </Route>

          {/* ================= NOT FOUND ================= */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
