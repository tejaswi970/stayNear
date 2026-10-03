import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompareProvider } from './contexts/CompareContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PGSearch from './pages/PGSearch';
import PGDetail from './pages/PGDetail';
import Compare from './pages/Compare';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import StayBot from './pages/StayBot';
import Unauthorized from './pages/Unauthorized';
import RoomRequests from './pages/RoomRequests';

// Owner pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerListings from './pages/owner/OwnerListings';
import AddPG from './pages/owner/AddPG';
import EditPG from './pages/owner/EditPG';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminListings from './pages/admin/AdminListings';
import AdminReports from './pages/admin/AdminReports';
import AdminUsers from './pages/admin/AdminUsers';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CompareProvider>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              {/* Public routes */}
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="pgs" element={<PGSearch />} />
              <Route path="pgs/:id" element={<PGDetail />} />
              <Route path="compare" element={<Compare />} />
              <Route path="unauthorized" element={<Unauthorized />} />

              {/* Authenticated routes */}
              <Route path="favorites" element={
                <ProtectedRoute><Favorites /></ProtectedRoute>
              } />
              <Route path="profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="requests" element={<ProtectedRoute roles={['tenant']}><RoomRequests /></ProtectedRoute>} />
              <Route path="staybot" element={
                <ProtectedRoute><StayBot /></ProtectedRoute>
              } />

              {/* Owner routes */}
              <Route path="owner" element={
                <ProtectedRoute roles={['owner']}><OwnerDashboard /></ProtectedRoute>
              } />
              <Route path="owner/requests" element={<ProtectedRoute roles={['owner']}><RoomRequests owner /></ProtectedRoute>} />
              <Route path="owner/pgs" element={
                <ProtectedRoute roles={['owner']}><OwnerListings /></ProtectedRoute>
              } />
              <Route path="owner/pgs/new" element={
                <ProtectedRoute roles={['owner']}><AddPG /></ProtectedRoute>
              } />
              <Route path="owner/pgs/:id/edit" element={
                <ProtectedRoute roles={['owner']}><EditPG /></ProtectedRoute>
              } />

              {/* Admin routes */}
              <Route path="admin" element={
                <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="admin/listings" element={
                <ProtectedRoute roles={['admin']}><AdminListings /></ProtectedRoute>
              } />
              <Route path="admin/reports" element={
                <ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>
              } />
              <Route path="admin/users" element={
                <ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>
              } />
              <Route path="admin/room-requests" element={<ProtectedRoute roles={['admin']}><RoomRequests admin /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </CompareProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
