import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AdminLayout from './components/admin/AdminLayout';
import AdminRouteGuard from './components/admin/AdminRouteGuard';
import ReceptionistLayout from './components/receptionist/ReceptionistLayout';
import ReceptionistRouteGuard from './components/receptionist/ReceptionistRouteGuard';
import { AuthProvider } from './context/AuthContext';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminAccountsPage from './pages/admin/AdminAccountsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminMedicinesPage from './pages/admin/AdminMedicinesPage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminServicesPage from './pages/admin/AdminServicesPage';
import ReceptionistAppointmentsPage from './pages/receptionist/ReceptionistAppointmentsPage';
import ReceptionistCheckInPage from './pages/receptionist/ReceptionistCheckInPage';
import ReceptionistCustomersPage from './pages/receptionist/ReceptionistCustomersPage';
import ReceptionistDashboardPage from './pages/receptionist/ReceptionistDashboardPage';
import ReceptionistServicesPage from './pages/receptionist/ReceptionistServicesPage';

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

          {/* Admin Dashboard Routes (Chỉ role ADMIN) */}
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

          {/* Receptionist Portal Routes (Role RECEPTIONIST & ADMIN) */}
          <Route path="/receptionist" element={<ReceptionistRouteGuard />}>
            <Route element={<ReceptionistLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ReceptionistDashboardPage />} />
              <Route path="appointments" element={<ReceptionistAppointmentsPage />} />
              <Route path="check-in" element={<ReceptionistCheckInPage />} />
              <Route path="customers" element={<ReceptionistCustomersPage />} />
              <Route path="services" element={<ReceptionistServicesPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
