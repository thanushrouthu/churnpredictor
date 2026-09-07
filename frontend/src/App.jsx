import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './components/AuthPage.jsx';
import UpdatePasswordPage from './components/UpdatePasswordPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import DashboardOverview from './views/DashboardOverview.jsx';
import TaskQueueView from './views/TaskQueueView.jsx';
import EmployeesView from './views/EmployeesView.jsx';
import AnalysisView from './views/AnalysisView.jsx';
import { supabase } from './utils/supabase.js';
import { API_BASE_URL } from './utils/api.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
    }
  };

  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to="/overview" replace />
          ) : (
            <AuthPage
              onAuthSuccess={(user) => {
                setCurrentUser(user);
              }}
            />
          )
        }
      />

      {/* Supabase Password Recovery Route */}
      <Route path="/update-password" element={<UpdatePasswordPage />} />

      {/* Protected Enterprise Dashboard Routes Wrapped in ProtectedRoute Guard */}
      <Route element={<ProtectedRoute currentUser={currentUser} setCurrentUser={setCurrentUser} />}>
        <Route element={<AppLayout currentUser={currentUser} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route
            path="/overview"
            element={<DashboardOverview currentUser={currentUser} />}
          />
          <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
          <Route path="/tasks" element={<TaskQueueView />} />
          <Route path="/employees" element={<EmployeesView />} />
          <Route path="/analysis/:taskId" element={<AnalysisView />} />
          <Route path="/analysis" element={<Navigate to="/analysis/1" replace />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
