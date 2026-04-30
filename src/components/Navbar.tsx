import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';
import { Sparkles, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">Autocap</span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button
                onClick={signOut}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
              >
                Get Started
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5 px-4 py-4 space-y-3">
            <a
              href="#how-it-works"
              className="block text-slate-400 hover:text-white text-sm py-2"
              onClick={() => setMobileOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#features"
              className="block text-slate-400 hover:text-white text-sm py-2"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="block text-slate-400 hover:text-white text-sm py-2"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="block text-slate-400 hover:text-white text-sm py-2"
              onClick={() => setMobileOpen(false)}
            >
              FAQ
            </a>
            <div className="pt-2 border-t border-white/5">
              {user ? (
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAuthModalOpen(true);
                    setMobileOpen(false);
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium rounded-lg"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
