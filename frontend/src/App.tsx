import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { InstitutionDetailPage } from './pages/InstitutionDetailPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { CoordinationWorkspacePage } from './pages/CoordinationWorkspacePage';
import { AlertsDeadlinesPage } from './pages/AlertsDeadlinesPage';
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { AdminPage } from './pages/AdminPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center text-xs text-slate-500 font-medium">
        Loading AICTE ICMS Administrative Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/institutions" element={<InstitutionsPage />} />
            <Route path="/institutions/:id" element={<InstitutionDetailPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/complaints/new" element={<ComplaintsPage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="/coordination" element={<CoordinationWorkspacePage />} />
            <Route path="/deadlines" element={<AlertsDeadlinesPage />} />
            <Route path="/reports" element={<ReportsAnalyticsPage />} />
            <Route path="/audit" element={<AuditTrailPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
