import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AdminLayout from './components/admin/AdminLayout';
import AdminRouteGuard from './components/admin/AdminRouteGuard';
import VetLayout from './components/vet/VetLayout';
import VetRouteGuard from './components/vet/VetRouteGuard';
import { AuthProvider } from './context/AuthContext';
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

// Veterinarian Pages (Thành viên 2 - Gói 3)
import VetWorkbenchPage from './pages/vet/VetWorkbenchPage';
import VetExaminationPage from './pages/vet/VetExaminationPage';
import VetRecordsPage from './pages/vet/VetRecordsPage';
import VetPetsPage from './pages/vet/VetPetsPage';

// Pet Owner Portal (UC-15)
import PetOwnerMedicalPage from './pages/owner/PetOwnerMedicalPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & Auth Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Admin Dashboard Routes (Role ADMIN) */}
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

          {/* Veterinarian Clinical Suite Routes (Role VETERINARIAN & ADMIN) */}
          <Route path="/vet" element={<VetRouteGuard />}>
            <Route element={<VetLayout />}>
              <Route index element={<Navigate to="workbench" replace />} />
              <Route path="workbench" element={<VetWorkbenchPage />} />
              <Route path="examination/:recordId" element={<VetExaminationPage />} />
              <Route path="records" element={<VetRecordsPage />} />
              <Route path="pets" element={<VetPetsPage />} />
            </Route>
          </Route>

          {/* Pet Owner Portal Routes (Role PET_OWNER & ALL) */}
          <Route path="/owner/medical-history" element={<PetOwnerMedicalPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
