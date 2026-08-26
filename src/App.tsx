/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './contexts/DataContext';
import useAuth from './hooks/useAuth';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import CurrentBook from './pages/CurrentBook';
import Library from './pages/Library';
import Flow from './pages/Flow';
import BookDetail from './pages/BookDetail';
import Trash from './pages/Trash';
import Login from './pages/Login';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasSpace, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-400">
        서재를 불러오는 중...
      </div>
    );
  }
  
  if (!isAuthenticated || !hasSpace) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="home" element={<Home />} />
              <Route path="current" element={<CurrentBook />} />
              <Route path="library" element={<Library />} />
              <Route path="library/:id" element={<BookDetail />} />
              <Route path="flow" element={<Flow />} />
              <Route path="trash" element={<Trash />} />
            </Route>
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
