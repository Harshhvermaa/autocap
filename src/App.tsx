import { useState } from 'react';
import { AuthProvider } from './hooks/useAuth';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import HowItWorksSection from './components/HowItWorksSection';
import FeaturesSection from './components/FeaturesSection';
import UseCasesSection from './components/UseCasesSection';
import PricingSection from './components/PricingSection';
import FAQSection from './components/FAQSection';
import Footer from './components/Footer';

function App() {
  const [heroScreen, setHeroScreen] = useState<'upload' | 'processing' | 'results'>(
    'upload',
  );
  const isResults = heroScreen === 'results';

  const handleNavigateHome = (sectionId?: string) => {
    if (isResults) {
      setHeroScreen('upload');
      setTimeout(() => {
        if (sectionId) {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else {
      if (sectionId) {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <AuthProvider>
      <div
        className={`bg-[#0a0a0f] text-white antialiased ${
          isResults ? 'h-screen overflow-hidden' : 'min-h-screen'
        }`}
      >
        <Navbar onNavigateHome={handleNavigateHome} />
        <main>
          <HeroSection screen={heroScreen} onScreenChange={setHeroScreen} />
          {!isResults && (
            <>
              <div id="how-it-works">
                <HowItWorksSection />
              </div>
              <div id="features">
                <FeaturesSection />
              </div>
              <UseCasesSection />
              <div id="pricing">
                <PricingSection />
              </div>
              <div id="faq">
                <FAQSection />
              </div>
            </>
          )}
        </main>
        {!isResults && <Footer onNavigateHome={handleNavigateHome} />}
      </div>
    </AuthProvider>
  );
}

export default App;
