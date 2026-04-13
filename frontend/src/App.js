import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { Toaster } from "./components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import MemberDashboard from "./pages/MemberDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import FeeSubmission from "./pages/FeeSubmission";
import FundAllocation from "./pages/FundAllocation";
import PendingApprovals from "./pages/PendingApprovals";
import UserManagement from "./pages/UserManagement";
import Notifications from "./pages/Notifications";
import MonthlyFees from "./pages/MonthlyFees";
import AllocationHistory from "./pages/AllocationHistory";

// Layout
import AppLayout from "./components/AppLayout";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="loader"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function DashboardRouter() {
  const { isAdmin } = useAuth();
  return isAdmin() ? <AdminDashboard /> : <MemberDashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <SignupPage />
        </PublicRoute>
      } />

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRouter />} />
        <Route path="notifications" element={<Notifications />} />
        
        {/* Admin Routes */}
        <Route path="fee-submission" element={
          <ProtectedRoute adminOnly>
            <FeeSubmission />
          </ProtectedRoute>
        } />
        <Route path="fund-allocation" element={
          <ProtectedRoute adminOnly>
            <FundAllocation />
          </ProtectedRoute>
        } />
        <Route path="allocation-history" element={
          <ProtectedRoute adminOnly>
            <AllocationHistory />
          </ProtectedRoute>
        } />
        <Route path="approvals" element={
          <ProtectedRoute adminOnly>
            <PendingApprovals />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute adminOnly>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="monthly-fees" element={
          <ProtectedRoute adminOnly>
            <MonthlyFees />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
