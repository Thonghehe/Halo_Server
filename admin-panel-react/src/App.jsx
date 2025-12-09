import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Mosaic } from 'react-loading-indicators';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Orders from './pages/Orders';
import CreateOrder from './pages/CreateOrder';
import EditOrder from './pages/EditOrder';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center vh-100">
      <Mosaic color={["#32cd32", "#327fcd", "#cd32cd", "#cd8032"]} />
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:userId" element={<UserDetail />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/create" element={<CreateOrder />} />
          <Route path="orders/:orderId/edit" element={<EditOrder />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

