import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';
import { useState } from 'react';

interface FooterProps {
  onNavigateHome: (sectionId?: string) => void;
}

export default function Footer({ onNavigateHome }: FooterProps) {
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <footer className="relative bg-[#0a0a0f] border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <button onClick={() => onNavigateHome()} className="flex items-center gap-2.5">
              <div className="flex items-center gap-[2px]">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[2.5px] rounded-full bg-gradient-to-t from-violet-500 to-blue-400"
                    style={{ height: `${8 + (i % 3) * 4}px` }}
                  />
                ))}
              </div>
              <span className="text-white font-semibold text-sm">Autocap</span>
            </button>

            <div className="flex items-center gap-6 text-xs text-white/30">
              <button onClick={() => onNavigateHome('how-it-works')} className="hover:text-white/60 transition-colors">
                How It Works
              </button>
              <button onClick={() => onNavigateHome('features')} className="hover:text-white/60 transition-colors">
                Features
              </button>
              <button onClick={() => onNavigateHome('pricing')} className="hover:text-white/60 transition-colors">
                Pricing
              </button>
              <button onClick={() => onNavigateHome('faq')} className="hover:text-white/60 transition-colors">
                FAQ
              </button>
            </div>

            <div>
              {user ? (
                <button
                  onClick={signOut}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/[0.04] text-center text-[10px] text-white/15">
            &copy; {new Date().getFullYear()} Autocap. All rights reserved.
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
