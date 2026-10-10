import React, { Component, ReactNode, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';

// Error Boundary to prevent blank white screens
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("CivicPulse UI Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--surface)' }}>
          <div className="card max-w-md w-full flex flex-col gap-4">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Something went wrong</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button onClick={() => window.location.reload()} className="btn btn-primary self-center">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Public pages
const Landing      = lazy(() => import('./pages/public/Landing'));
const Login        = lazy(() => import('./pages/public/Login'));
const Register     = lazy(() => import('./pages/public/Register'));
const CommunityMap = lazy(() => import('./pages/public/CommunityMap'));

// Citizen pages
const CitizenDashboard   = lazy(() => import('./pages/citizen/Dashboard'));
const ReportIssue        = lazy(() => import('./pages/citizen/ReportIssue'));
const MyComplaints       = lazy(() => import('./pages/citizen/MyComplaints'));
const ComplaintDetail    = lazy(() => import('./pages/citizen/ComplaintDetail'));
const NearbyIssues       = lazy(() => import('./pages/citizen/NearbyIssues'));
const CitizenNotifications = lazy(() => import('./pages/citizen/Notifications'));

// Worker pages
const WorkerDashboard = lazy(() => import('./pages/worker/Dashboard'));
const WorkerMyIssues  = lazy(() => import('./pages/worker/MyIssues'));
const WorkerIssueDetail = lazy(() => import('./pages/worker/IssueDetail'));
const WorkerPerformance = lazy(() => import('./pages/worker/Performance'));

// Admin pages
const AdminDashboard    = lazy(() => import('./pages/admin/Dashboard'));
const AdminIssues       = lazy(() => import('./pages/admin/Issues'));
const AdminIssueDetail  = lazy(() => import('./pages/admin/IssueDetail'));
const AdminWorkers      = lazy(() => import('./pages/admin/Workers'));
const AdminTeams        = lazy(() => import('./pages/admin/Teams'));
const AdminIntelligence = lazy(() => import('./pages/admin/Intelligence'));
const AdminAnalytics    = lazy(() => import('./pages/admin/Analytics'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/"              element={<Landing />} />
              <Route path="/login"         element={<Login />} />
              <Route path="/register"      element={<Register />} />
              <Route path="/community-map" element={<CommunityMap />} />

              {/* Citizen */}
              <Route path="/citizen" element={<ProtectedRoute roles={['CITIZEN']}><CitizenDashboard /></ProtectedRoute>} />
              <Route path="/citizen/report" element={<ProtectedRoute roles={['CITIZEN']}><ReportIssue /></ProtectedRoute>} />
              <Route path="/citizen/complaints" element={<ProtectedRoute roles={['CITIZEN']}><MyComplaints /></ProtectedRoute>} />
              <Route path="/citizen/complaints/:complaintId" element={<ProtectedRoute roles={['CITIZEN']}><ComplaintDetail /></ProtectedRoute>} />
              <Route path="/citizen/nearby" element={<ProtectedRoute roles={['CITIZEN']}><NearbyIssues /></ProtectedRoute>} />
              <Route path="/citizen/notifications" element={<ProtectedRoute roles={['CITIZEN']}><CitizenNotifications /></ProtectedRoute>} />

              {/* Worker */}
              <Route path="/worker"                element={<ProtectedRoute roles={['WORKER']}><WorkerDashboard /></ProtectedRoute>} />
              <Route path="/worker/issues"         element={<ProtectedRoute roles={['WORKER']}><WorkerMyIssues /></ProtectedRoute>} />
              <Route path="/worker/issues/:id"     element={<ProtectedRoute roles={['WORKER']}><WorkerIssueDetail /></ProtectedRoute>} />
              <Route path="/worker/performance"    element={<ProtectedRoute roles={['WORKER']}><WorkerPerformance /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin"                element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/issues"         element={<ProtectedRoute roles={['ADMIN']}><AdminIssues /></ProtectedRoute>} />
              <Route path="/admin/issues/:id"     element={<ProtectedRoute roles={['ADMIN']}><AdminIssueDetail /></ProtectedRoute>} />
              <Route path="/admin/workers"        element={<ProtectedRoute roles={['ADMIN']}><AdminWorkers /></ProtectedRoute>} />
              <Route path="/admin/teams"          element={<ProtectedRoute roles={['ADMIN']}><AdminTeams /></ProtectedRoute>} />
              <Route path="/admin/intelligence"   element={<ProtectedRoute roles={['ADMIN']}><AdminIntelligence /></ProtectedRoute>} />
              <Route path="/admin/analytics"      element={<ProtectedRoute roles={['ADMIN']}><AdminAnalytics /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
