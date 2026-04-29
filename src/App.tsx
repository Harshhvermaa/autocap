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
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-white antialiased">
        <Navbar />
        <main>
          <HeroSection />
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
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
