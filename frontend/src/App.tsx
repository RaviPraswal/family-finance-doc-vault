import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
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

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary/30">
        <Routes>
          <Route 
            path="/" 
            element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
          />
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
