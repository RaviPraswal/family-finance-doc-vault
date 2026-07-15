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
  LogOut,
  Sun,
  Moon,
  Clock
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const navigation = [
  { name: 'Document Vault', href: '/dashboard', icon: FolderOpen },
  { name: 'Physical Almirah', href: '/dashboard/physical-vault', icon: Landmark },
  { name: 'Ledger & AI Scheduler', href: '/dashboard/ledger', icon: Clock },

  { name: 'Portfolio Overview', href: '/dashboard/portfolio', icon: TrendingUp },
  { name: 'Bank Accounts', href: '/dashboard/bank-accounts', icon: Landmark },
  { name: 'Deposits (FD/RD)', href: '/dashboard/deposits', icon: Wallet },
  { name: 'Investments', href: '/dashboard/investments', icon: Briefcase },
  { name: 'Loans & EMI', href: '/dashboard/loans', icon: CreditCard },
  { name: 'Chit Funds', href: '/dashboard/chit-funds', icon: Users },
  { name: 'Udhaar (Peer Lending)', href: '/dashboard/peer-lending', icon: Users },
  { name: 'Side Income', href: '/dashboard/income', icon: Wallet },
  { name: 'Projects & Expenses', href: '/dashboard/projects', icon: HardHat },
  { name: 'Daily Expenses', href: '/dashboard/expenses', icon: Wallet },
  { name: 'Goals', href: '/dashboard/goals', icon: TrendingUp },
  { name: 'Family Members', href: '/dashboard/family', icon: Users },
];

export default function DashboardLayout() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 glass-panel border-r border-border/50 flex flex-col hidden md:flex z-10 m-4 rounded-2xl">
        <div className="h-20 flex items-center px-6 border-b border-border/50 shrink-0">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            FinNest
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-border/50 space-y-2 shrink-0">
          {currentUser && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/40 rounded-xl mb-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black uppercase text-xs shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate leading-snug">{currentUser.name}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">{currentUser.email}</p>
                <p className="text-[9px] uppercase font-black text-primary tracking-wider mt-1.5">
                  {currentUser.role === 'OWNER' ? '👑 Admin' : '👤 Member'}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-foreground rounded-xl hover:bg-muted/50 transition-colors"
          >
            {theme === 'dark' ? (
              <><Sun className="mr-3 h-5 w-5" /> Light Mode</>
            ) : (
              <><Moon className="mr-3 h-5 w-5" /> Dark Mode</>
            )}
          </button>
          
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Mobile Header */}
        <div className="md:hidden h-16 border-b border-border/50 glass-panel flex items-center justify-between px-4 z-20 m-4 rounded-xl">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">FinNest</h1>
            {currentUser && (
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                {currentUser.role === 'OWNER' ? '👑 Admin' : '👤 Member'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="text-xs font-semibold text-muted-foreground">
                Hi, {currentUser.name.split(' ')[0]}
              </span>
            )}
            <button onClick={toggleTheme} className="p-2 text-foreground">
               {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={logout} className="text-sm text-destructive font-medium">Logout</button>
          </div>
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-0 md:pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
