import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DashboardLayout from './components/DashboardLayout';
import Projects from './pages/Projects';
import PortfolioOverview from './pages/PortfolioOverview';
import BankAccounts from './pages/BankAccounts';
import Deposits from './pages/Deposits';
import Investments from './pages/Investments';
import Loans from './pages/Loans';
import ChitFunds from './pages/ChitFunds';
import PeerLending from './pages/PeerLending';
import SideIncome from './pages/SideIncome';

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const token = useAuthStore((state) => state.token);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      {/* Mesh gradient background container behind everything */}
      <div className="mesh-bg" />
      
      <div className="min-h-screen font-sans antialiased selection:bg-primary/30 relative z-0 transition-colors duration-300">
        <Routes>
          {/* Root route goes to landing page now */}
          <Route path="/" element={<Landing />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } 
          >
            {/* The index route will render the existing Document Vault */}
            <Route index element={<Dashboard />} />
            
            <Route path="portfolio" element={<PortfolioOverview />} />
            <Route path="bank-accounts" element={<BankAccounts />} />
            <Route path="deposits" element={<Deposits />} />
            <Route path="investments" element={<Investments />} />
            <Route path="loans" element={<Loans />} />
            <Route path="chit-funds" element={<ChitFunds />} />
            <Route path="peer-lending" element={<PeerLending />} />
            <Route path="income" element={<SideIncome />} />
            <Route path="projects" element={<Projects />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
