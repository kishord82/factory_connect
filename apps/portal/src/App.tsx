import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { AuthContext, parseJwt, isCaUser } from './lib/auth.js';
import type { AuthUser } from './lib/auth.js';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { Orders } from './pages/Orders.js';
import { Shipments } from './pages/Shipments.js';
import { Invoices } from './pages/Invoices.js';
import { Connections } from './pages/Connections.js';
import { Calendar } from './pages/Calendar.js';
import { Analytics } from './pages/Analytics.js';
import { Admin } from './pages/Admin.js';
import { Login } from './pages/Login.js';
import { MappingStudio } from './pages/MappingStudio.js';
import { OrderExplorer } from './pages/OrderExplorer.js';
import { EdiMonitor } from './pages/EdiMonitor.js';
import { BridgeStatus } from './pages/BridgeStatus.js';
import { Settings } from './pages/Settings.js';
import { CaLayout } from './components/ca/CaLayout.js';
import { CaDashboard } from './pages/ca/CaDashboard.js';
import { CaClients } from './pages/ca/CaClients.js';
import { CaClientDetail } from './pages/ca/CaClientDetail.js';
import { CaCompliance } from './pages/ca/CaCompliance.js';
import { CaReconciliation } from './pages/ca/CaReconciliation.js';
import { CaDocuments } from './pages/ca/CaDocuments.js';
import { CaNotices } from './pages/ca/CaNotices.js';
import { CaAnalytics } from './pages/ca/CaAnalytics.js';
import { CaSettings } from './pages/ca/CaSettings.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('fc_token');
    if (!token) return null;
    const parsed = parseJwt(token);
    if (!parsed) {
      localStorage.removeItem('fc_token');
      return null;
    }
    return parsed;
  });

  const login = useCallback((token: string) => {
    localStorage.setItem('fc_token', token);
    setUser(parseJwt(token));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fc_token');
    setUser(null);
    queryClient.clear();
  }, []);

  const authValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    login,
    logout,
  }), [user, login, logout]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={user ? <Navigate to={isCaUser(user) ? '/ca' : '/'} /> : <Login />} />
            <Route element={user ? <Layout /> : <Navigate to="/login" />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/explorer" element={<OrderExplorer />} />
              <Route path="shipments" element={<Shipments />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="connections" element={<Connections />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="admin" element={<Admin />} />
              <Route path="mapping-studio" element={<MappingStudio />} />
              <Route path="edi-monitor" element={<EdiMonitor />} />
              <Route path="bridge-status" element={<BridgeStatus />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route element={user ? <CaLayout /> : <Navigate to="/login" />}>
              <Route path="ca" element={<CaDashboard />} />
              <Route path="ca/clients" element={<CaClients />} />
              <Route path="ca/clients/:id" element={<CaClientDetail />} />
              <Route path="ca/compliance" element={<CaCompliance />} />
              <Route path="ca/reconciliation" element={<CaReconciliation />} />
              <Route path="ca/documents" element={<CaDocuments />} />
              <Route path="ca/notices" element={<CaNotices />} />
              <Route path="ca/analytics" element={<CaAnalytics />} />
              <Route path="ca/settings" element={<CaSettings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
