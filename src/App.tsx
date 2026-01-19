/**
 * Biz-Panel - Main Application with Authentication
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocaleProvider } from '@douyinfe/semi-ui';
import vi_VN from '@douyinfe/semi-ui/lib/es/locale/source/vi_VN';
import { isAuthenticated } from './services/api';

// Layout
import { MainLayout } from './components/layout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import {
  Dashboard,
  Websites,
  Databases,
  Docker,
  Security,
  AppStore,
  Projects,
  Files,
  Logs,
  Terminal,
  Cron,
  Settings,
  Software,
  SSL,
  PHP,
  Services,
} from './pages';
import Login from './pages/Login';

// Styles
import './theme/index.css';
import './pages/Login.css';
import './pages/Dashboard.css';
import './pages/Websites.css';
import './pages/Databases.css';
import './pages/Docker.css';
import './pages/Security.css';
import './pages/AppStore.css';
import './pages/Projects.css';
import './pages/Files.css';
import './pages/Logs.css';
import './pages/Terminal.css';
import './pages/Cron.css';
import './pages/Settings.css';
import './pages/Software.css';
import './pages/SSL.css';
import './pages/PHP.css';
import './pages/Services.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider locale={vi_VN}>
          <BrowserRouter>
            <Routes>
              {/* Public route - Login */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="websites" element={<Websites />} />
                <Route path="projects" element={<Projects />} />
                <Route path="databases" element={<Databases />} />
                <Route path="docker" element={<Docker />} />
                <Route path="security" element={<Security />} />
                <Route path="files" element={<Files />} />
                <Route path="logs" element={<Logs />} />
                <Route path="terminal" element={<Terminal />} />
                <Route path="cron" element={<Cron />} />
                <Route path="appstore" element={<AppStore />} />
                <Route path="software" element={<Software />} />
                <Route path="ssl" element={<SSL />} />
                <Route path="php" element={<PHP />} />
                <Route path="services" element={<Services />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </LocaleProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
