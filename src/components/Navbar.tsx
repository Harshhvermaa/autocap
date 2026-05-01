import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigateHome: (sectionId?: string) => void;
}

export default function Navbar({ onNavigateHome }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="w-full px-6 sm:px-10 lg:px-14 h-16 flex items-center justify-between">
          {/* Logo — always left-aligned */}
          <button onClick={() => onNavigateHome()} className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-[3px]">
              {[14, 20, 10, 18, 12].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-gradient-to-t from-violet-500 to-blue-400"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Autocap</span>
          </button>

          {/* Desktop nav — center */}
          <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
            <button onClick={() => onNavigateHome('how-it-works')} className="hover:text-white transition-colors duration-200">
              How It Works
            </button>
            <button onClick={() => onNavigateHome('features')} className="hover:text-white transition-colors duration-200">
              Features
            </button>
            <button onClick={() => onNavigateHome('pricing')} className="hover:text-white transition-colors duration-200">
              Pricing
            </button>
            <button onClick={() => onNavigateHome('faq')} className="hover:text-white transition-colors duration-200">
              FAQ
            </button>
          </div>

          {/* Desktop auth — right */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {user ? (
              <button
                onClick={signOut}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-all duration-200"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white/60"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-5 space-y-1">
            {['how-it-works', 'features', 'pricing', 'faq'].map((id) => (
              <button
                key={id}
                className="block w-full text-left text-white/50 hover:text-white text-base py-2.5"
                onClick={() => { onNavigateHome(id); setMobileOpen(false); }}
              >
                {id === 'how-it-works' ? 'How It Works' : id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
            <div className="pt-3 border-t border-white/[0.06]">
              {user ? (
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="text-base text-white/50 hover:text-white"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { setAuthModalOpen(true); setMobileOpen(false); }}
                  className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-lg"
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
