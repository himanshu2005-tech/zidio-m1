import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import VideoCall from './components/VideoCall';
import DashboardLayout from './components/DashboardLayout';
import Home from './components/Home';
import Records from './components/Records';
import Settings from './components/Settings';

// Wrapper for the call screen to extract the ID and handle routing
function CallRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  if (!id) return <Navigate to="/dashboard/home" replace />;
  
  return <VideoCall channelName={id} user={user} onLeave={() => navigate('/dashboard/home')} />;
}

// Wrapper to protect dashboard routes
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
}

// Wrapper for public routes (e.g. Login)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (user) return <Navigate to="/dashboard/home" replace />;
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/home" replace />} />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="home" element={<Home />} />
        <Route path="records" element={<Records />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      <Route path="/call/:id" element={<CallRoute />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;