import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider } from './pages/ThemeContext/ThemeContext';

import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage/LoginPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import UsersPage from './pages/UsersPage/UsersPage';
import RoomsPage from './pages/RoomsPage/RoomsPage';
import ChecklistsPage from './pages/ChecklistsPage/ChecklistsPage';
import RoomVerificationHistoryPage from './pages/RoomVerificationHistoryPage/RoomVerificationHistoryPage';
import RoomRiskAnalysisPage from './pages/RoomRiskAnalysisPage/RoomRiskAnalysisPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import ActiveVerificationPage from './pages/ActiveVerificationPage/ActiveVerificationPage';

export default function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="checklists" element={<ChecklistsPage />} />
              <Route path="verification/:verificationId" element={<ActiveVerificationPage />} />
              <Route path="history-salles" element={<RoomVerificationHistoryPage />} />
              <Route path="analyse-salles" element={<RoomRiskAnalysisPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}