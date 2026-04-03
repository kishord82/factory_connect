import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { AuthContext, parseJwt } from './lib/auth.js';
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
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route element={user ? <Layout /> : <Navigate to="/login" />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="shipments" element={<Shipments />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="connections" element={<Connections />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="admin" element={<Admin />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
