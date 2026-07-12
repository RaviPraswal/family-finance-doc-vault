import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  FolderOpen, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  Landmark, 
  Users, 
  Briefcase, 
  HardHat,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navigation = [
  { name: 'Document Vault', href: '/dashboard', icon: FolderOpen },
  { name: 'Portfolio Overview', href: '/dashboard/portfolio', icon: TrendingUp },
  { name: 'Bank Accounts', href: '/dashboard/bank-accounts', icon: Landmark },
  { name: 'Deposits (FD/RD)', href: '/dashboard/deposits', icon: Wallet },
  { name: 'Investments', href: '/dashboard/investments', icon: Briefcase },
  { name: 'Loans & EMI', href: '/dashboard/loans', icon: CreditCard },
  { name: 'Chit Funds', href: '/dashboard/chit-funds', icon: Users },
  { name: 'Udhaar (Peer Lending)', href: '/dashboard/peer-lending', icon: Users },
  { name: 'Side Income', href: '/dashboard/income', icon: Wallet },
  { name: 'Projects & Expenses', href: '/dashboard/projects', icon: HardHat },
];

export default function DashboardLayout() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            FinNest Wealth
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-muted-foreground'
                      }`}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header (optional, simple version) */}
        <div className="md:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4">
          <h1 className="text-xl font-bold text-foreground">FinNest</h1>
          <button onClick={logout} className="text-sm text-muted-foreground">Logout</button>
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
