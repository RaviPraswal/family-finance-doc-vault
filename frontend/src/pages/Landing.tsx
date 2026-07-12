import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Moon, Sun, ArrowRight, Shield, Wallet, Users } from 'lucide-react';

export default function Landing() {
  const token = useAuthStore((state) => state.token);
  const { theme, toggleTheme } = useThemeStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Navigation Bar */}
      <nav className="w-full px-6 py-4 flex items-center justify-between z-10 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            FinNest
          </span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          {token ? (
            <Link to="/dashboard" className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5">
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Log In
              </Link>
              <Link to="/register" className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5">
                Sign Up
              </Link>
            </div>
          )}
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 z-10 text-center pb-20">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto mt-20"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            FinNest v2.0 is live
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-foreground leading-[1.1]">
            Manage Your Family Wealth{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">
              Beautifully.
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            A secure, modern vault for all your family's financial documents. Track bank accounts, investments, loans, and shared expenses in one stunning dashboard.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={token ? "/dashboard" : "/register"} className="w-full sm:w-auto px-8 py-4 rounded-full bg-foreground text-background font-semibold hover:scale-105 transition-transform shadow-xl flex items-center justify-center gap-2">
              Get Started for Free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-full glass-panel font-semibold hover:bg-white/20 transition-colors flex items-center justify-center text-foreground">
              View Demo
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-32 w-full px-4"
        >
          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-panel p-8 rounded-3xl text-left">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-foreground">Secure Vault</h3>
            <p className="text-muted-foreground leading-relaxed">End-to-end encryption for your most sensitive tax returns, IDs, and property deeds.</p>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-panel p-8 rounded-3xl text-left">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
              <Wallet className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-foreground">Smart Portfolio</h3>
            <p className="text-muted-foreground leading-relaxed">Visual charts breaking down your Net Worth across banks, FDs, investments, and loans.</p>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-panel p-8 rounded-3xl text-left">
            <div className="h-12 w-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-6 border border-pink-500/20">
              <Users className="h-6 w-6 text-pink-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-foreground">Family Access</h3>
            <p className="text-muted-foreground leading-relaxed">Share specific documents securely with your spouse or accountant with temporary links.</p>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-20 z-10 glass-panel border-b-0 border-x-0 rounded-none">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-muted-foreground text-sm">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">FinNest</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
