
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

// Layouts & Route Guards
import AdminLayout from './components/admin/AdminLayout';
import AdminRouteGuard from './components/admin/AdminRouteGuard';

import VetLayout from './components/vet/VetLayout';
import VetRouteGuard from './components/vet/VetRouteGuard';

import InventoryLayout from './components/inventory/InventoryLayout';
import InventoryRouteGuard from './components/inventory/InventoryRouteGuard';

import BillingLayout from './components/billing/BillingLayout';
import BillingRouteGuard from './components/billing/BillingRouteGuard';

// Authentication
import { AuthProvider } from './context/AuthContext';

// Public Pages
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Admin Pages
import AdminAccountsPage from './pages/admin/AdminAccountsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminMedicinesPage from './pages/admin/AdminMedicinesPage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminServicesPage from './pages/admin/AdminServicesPage';

// Veterinarian Pages
import VetWorkbenchPage from './pages/vet/VetWorkbenchPage';
import VetExaminationPage from './pages/vet/VetExaminationPage';
import VetRecordsPage from './pages/vet/VetRecordsPage';
import VetPetsPage from './pages/vet/VetPetsPage';

// Pet Owner Pages
import PetOwnerMedicalPage from './pages/owner/PetOwnerMedicalPage';

// Inventory Pages
import InventoryBatchesPage from './pages/inventory/InventoryBatchesPage';

// Billing Pages
import BillingQueuePage from './pages/billing/BillingQueuePage';
import InvoiceDetailPage from './pages/billing/InvoiceDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ================= PUBLIC & AUTH ROUTES ================= */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ================= ADMIN ROUTES ================= */}
          <Route path="/admin" element={<AdminRouteGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="overview" replace />} />

              <Route path="overview" element={<AdminOverviewPage />} />
              <Route path="accounts" element={<AdminAccountsPage />} />
              <Route path="roles" element={<AdminRolesPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="medicines" element={<AdminMedicinesPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            </Route>
          </Route>

          {/* ================= VETERINARIAN ROUTES ================= */}
          <Route path="/vet" element={<VetRouteGuard />}>
            <Route element={<VetLayout />}>
              <Route index element={<Navigate to="workbench" replace />} />

              <Route path="workbench" element={<VetWorkbenchPage />} />
              <Route
                path="examination/:recordId"
                element={<VetExaminationPage />}
              />
              <Route path="records" element={<VetRecordsPage />} />
              <Route path="pets" element={<VetPetsPage />} />
            </Route>
          </Route>

          {/* ================= INVENTORY ROUTES ================= */}
          <Route path="/inventory" element={<InventoryRouteGuard />}>
            <Route element={<InventoryLayout />}>
              <Route index element={<Navigate to="batches" replace />} />

              <Route
                path="batches"
                element={<InventoryBatchesPage />}
              />
            </Route>
          </Route>

          {/* ================= BILLING ROUTES ================= */}
          <Route path="/billing" element={<BillingRouteGuard />}>
            <Route element={<BillingLayout />}>
              <Route index element={<Navigate to="queue" replace />} />

              <Route path="queue" element={<BillingQueuePage />} />
              <Route
                path="invoices/:invoiceId"
                element={<InvoiceDetailPage />}
              />
            </Route>
          </Route>

          {/* ================= PET OWNER ROUTES ================= */}
          <Route
            path="/owner/medical-history"
            element={<PetOwnerMedicalPage />}
          />

          {/* ================= NOT FOUND ================= */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
