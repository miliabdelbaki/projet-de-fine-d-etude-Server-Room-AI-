import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RoomsPage from './pages/RoomsPage';
import ChecklistsPage from './pages/ChecklistsPage';
import RoomVerificationHistoryPage from './pages/RoomVerificationHistoryPage';
import RoomRiskAnalysisPage from './pages/RoomRiskAnalysisPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SettingsPage from './pages/SettingsPage';

const theme = createTheme({ palette: { primary: { main: '#1976d2' }, secondary: { main: '#dc004e' } } });

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="checklists" element={<ChecklistsPage />} />
              <Route path="history-salles" element={<RoomVerificationHistoryPage />} />
              <Route path="analyse-salles" element={<RoomRiskAnalysisPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
