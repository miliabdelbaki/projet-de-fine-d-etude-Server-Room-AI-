import './ProtectedRoute.css';
import { Navigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

export default function ProtectedRoute({ children }) {
  const user = authAPI.getCurrentUser();
  return user ? children : <Navigate to="/login" replace />;
}
