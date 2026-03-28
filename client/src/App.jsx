import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Monitor from './pages/Monitor';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex bg-slate-100 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto w-full max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
             <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/monitor" 
        element={
          <ProtectedRoute>
             <Monitor />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
