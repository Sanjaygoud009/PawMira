import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import { PageLoader } from './components/ui/LoadingSpinner';

// Lazy-loaded pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const ReportEmergency = lazy(() => import('./pages/ReportEmergency'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const Adoption = lazy(() => import('./pages/Adoption'));
const Volunteer = lazy(() => import('./pages/Volunteer'));
const Contact = lazy(() => import('./pages/Contact'));
const Gallery = lazy(() => import('./pages/Gallery'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportEmergency />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/adoption" element={<Adoption />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0F172A',
              color: '#F8FAFC',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 20px',
            },
            success: {
              iconTheme: { primary: '#22C55E', secondary: '#F8FAFC' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#F8FAFC' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
