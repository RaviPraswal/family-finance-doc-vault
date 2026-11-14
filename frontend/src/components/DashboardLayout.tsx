import { useCallback, useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import PageErrorBoundary from './PageErrorBoundary';
import { GlassPanel, PrimaryAction } from './ui/LiquidControls';
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
  Clock,
  Percent,
  Zap,
  CalendarClock,
  Droplets,
  Menu,
  X,
  Home,
  ListOrdered,
  ArrowDownLeft,
  HandCoins,
  Scale,
  Target,
  Plus
} from 'lucide-react';
import AddEntry from './AddEntry';
import { useAuthStore } from '../store/authStore';
import { useThemeStore, SKIN_LABELS, nextSkin } from '../store/themeStore';

interface NavItem { name: string; href: string; icon: typeof TrendingUp }
/**
 * Sprint 9: the menu follows the four plain categories (Money In, Money Out, Savings & Investments, Debts), with
 * planning tools and papers after them. Every page has exactly one place.
 */
const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Full overview', href: '/dashboard/portfolio', icon: TrendingUp },
    { name: 'All entries', href: '/dashboard/expenses', icon: ListOrdered },
    { name: 'Quick Logger', href: '/dashboard/quick-logger', icon: Zap },
  ] },
  { title: 'Money In', items: [
    { name: 'Side income', href: '/dashboard/income', icon: ArrowDownLeft },
  ] },
  { title: 'Money Out', items: [
    { name: 'Spending limits', href: '/dashboard/budgets', icon: Percent },
    { name: 'Projects', href: '/dashboard/projects', icon: HardHat },
  ] },
  { title: 'Savings & Investments', items: [
    { name: 'Bank Accounts', href: '/dashboard/bank-accounts', icon: Landmark },
    { name: 'Deposits (FD/RD)', href: '/dashboard/deposits', icon: Wallet },
    { name: 'Investments', href: '/dashboard/investments', icon: Briefcase },
    { name: 'Chit Funds', href: '/dashboard/chit-funds', icon: Users },
    { name: 'Udhaar (lent & borrowed)', href: '/dashboard/peer-lending', icon: HandCoins },
  ] },
  { title: 'Debts', items: [
    { name: 'Loans & EMI', href: '/dashboard/loans', icon: Scale },
    { name: 'Credit Cards', href: '/dashboard/credit-cards', icon: CreditCard },
  ] },
  { title: 'Planning', items: [
    { name: 'Goals', href: '/dashboard/goals', icon: Target },
    { name: 'Upcoming payments', href: '/dashboard/commitments', icon: CalendarClock },
    { name: 'Scheduled payments (AI)', href: '/dashboard/ledger', icon: Clock },
  ] },
  { title: 'Papers & family', items: [
    { name: 'Document Vault', href: '/dashboard/vault', icon: FolderOpen },
    { name: 'Physical Almirah', href: '/dashboard/physical-vault', icon: Landmark },
    { name: 'Family Members', href: '/dashboard/family', icon: Users },
  ] },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-4 px-3">
      {navGroups.map((group, gi) => {
        const id = `nav-group-${gi}-${onNavigate ? 'm' : 'd'}`;
        return (
          <div key={group.title ?? 'main'} role={group.title ? 'group' : undefined} aria-labelledby={group.title ? id : undefined}>
            {group.title && <p id={id} className="fn-nav-heading px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{group.title}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={`fn-nav-item flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <item.icon className={`mr-3 h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Who is signed in, light/dark, look, logout — the sidebar's footer, also in the phone menu. */
function AccountFooter() {
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.user);
  const { theme, toggleTheme, skin, toggleSkin } = useThemeStore();
  return (
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
        onClick={toggleSkin}
        aria-label={`Look: ${SKIN_LABELS[skin]}. Switch to ${SKIN_LABELS[nextSkin(skin)]}`}
        title={`Switch to ${SKIN_LABELS[nextSkin(skin)]}`}
        className="flex items-center w-full px-3 py-2 text-sm font-medium text-foreground rounded-xl hover:bg-muted/50 transition-colors"
      >
        <Droplets className="mr-3 h-5 w-5" />
        Look: {SKIN_LABELS[skin]}
      </button>

      <button
        onClick={logout}
        className="flex items-center w-full px-3 py-2 text-sm font-medium text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="mr-3 h-5 w-5" />
        Logout
      </button>
    </div>
  );
}

function AddEntryButton({ onClick }: { onClick: () => void }) {
  return (
    <PrimaryAction icon={<Plus className="h-4 w-4" />} onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
      Add entry
    </PrimaryAction>
  );
}

const Brand = () => (
  <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
    FinNest
  </Link>
);

export default function DashboardLayout() {
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.user);
  // Phones: the sidebar does not fit, so it opens as a menu from the top bar.
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden">
      {/* Liquid Glass dial texture (hidden in other skins) */}
      <div className="fn-wallpaper hidden" aria-hidden="true" />
      {/* Sidebar (tablet and desktop) */}
      <GlassPanel className="fn-sidebar w-64 glass-panel border-r border-border/50 flex-col hidden md:flex z-10 m-4 rounded-2xl">
        <div className="h-20 flex items-center px-6 border-b border-border/50 shrink-0">
          <Brand />
        </div>
        <div className="px-6 pt-4 shrink-0">
          <AddEntryButton onClick={() => setAdding(true)} />
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <NavLinks pathname={location.pathname} />
        </nav>
        <AccountFooter />
      </GlassPanel>

      {/* Phone menu */}
      {menuOpen && (
        <div className="fn-drawer-layer fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeMenu} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fn-drawer absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border/50 shadow-2xl flex flex-col"
          >
            <div className="h-16 flex items-center justify-between px-5 border-b border-border/50 shrink-0">
              <Brand />
              <button type="button" onClick={closeMenu} aria-label="Close menu" className="p-2 -mr-2 rounded-lg text-foreground hover:bg-muted/50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Main" className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              <NavLinks pathname={location.pathname} onNavigate={closeMenu} />
            </nav>
            <AccountFooter />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative z-10">
        {/* Phone top bar */}
        <GlassPanel className="fn-toolbar md:hidden h-14 border-b border-border/50 glass-panel flex items-center justify-between gap-2 px-2 z-20 m-3 mb-2 rounded-xl shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="p-2.5 rounded-lg text-foreground hover:bg-muted/50"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg font-bold text-foreground truncate">FinNest</span>
          </div>
          <button type="button" onClick={() => setAdding(true)} aria-label="Add entry"
            className="ml-auto p-2.5 rounded-lg text-primary hover:bg-muted/50"><Plus className="h-5 w-5" /></button>
          {currentUser && (
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold whitespace-nowrap mr-2">
              {currentUser.role === 'OWNER' ? '👑 Admin' : '👤 Member'}
            </span>
          )}
        </GlassPanel>

        {/* Liquid Glass scroll edge (hidden in other skins) */}
        <div className="fn-scroll-edge hidden" aria-hidden="true" />
        {/* Page Content */}
        <main className="fn-content flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-8 pt-0 md:pt-4">
          <PageErrorBoundary resetKey={location.pathname}><Outlet /></PageErrorBoundary>
        </main>
        {/* saving from here refreshes the page underneath, whichever it is */}
        <AddEntry open={adding} onClose={() => setAdding(false)} onSaved={() => window.dispatchEvent(new Event('finnest:entry-saved'))} />
      </div>
    </div>
  );
}
