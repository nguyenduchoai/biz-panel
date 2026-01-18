/**
 * Biz-Panel - Main Application
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocaleProvider } from '@douyinfe/semi-ui';
import en_US from '@douyinfe/semi-ui/lib/es/locale/source/en_US';

// Layout
import { MainLayout } from './components/layout';

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
} from './pages';

// Styles
import './theme/index.css';
import './pages/Dashboard.css';
import './pages/Websites.css';
import './pages/Databases.css';
import './pages/Docker.css';
import './pages/Security.css';
import './pages/AppStore.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider locale={en_US}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
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
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocaleProvider>
    </QueryClientProvider>
  );
};

export default App;
