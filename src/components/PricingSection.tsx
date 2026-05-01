import { Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';
import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out Autocap',
    features: [
      '3 audio files per month',
      'MP3, WAV, M4A support',
      'SRT file download',
      'Caption preview & editing',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'Unlimited captions for serious creators',
    features: [
      'Unlimited audio files',
      'All audio formats',
      'SRT file download',
      'Caption preview & editing',
      'Priority processing',
      'Email support',
    ],
    cta: 'Get Pro',
    highlighted: true,
  },
];

export default function PricingSection() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleCta = () => {
    if (!user) {
      setAuthModalOpen(true);
    }
  };

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Accent glow */}
      <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] rounded-full bg-violet-600/[0.04] blur-[80px]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-400 tracking-[0.2em] uppercase mb-4">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Simple pricing
          </h2>
          <p className="text-white/35 mt-4 max-w-md mx-auto text-sm">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-2xl p-7 transition-all duration-500 ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-violet-600/90 to-blue-600/90 text-white border border-violet-500/30 shadow-xl shadow-violet-500/10'
                  : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-white text-violet-600 text-[10px] font-bold rounded-full shadow-sm tracking-wide uppercase">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-white mb-1">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-white">
                  {plan.price}
                </span>
                <span className={`text-sm ${plan.highlighted ? 'text-white/60' : 'text-white/30'}`}>
                  {plan.period}
                </span>
              </div>
              <p className={`text-sm mb-6 ${plan.highlighted ? 'text-white/70' : 'text-white/30'}`}>
                {plan.description}
              </p>
              <ul className="space-y-2.5 mb-7">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-sm">
                    <Check
                      size={14}
                      className={plan.highlighted ? 'text-white/80' : 'text-violet-400'}
                    />
                    <span className={plan.highlighted ? 'text-white/80' : 'text-white/50'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleCta}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                  plan.highlighted
                    ? 'bg-white text-violet-600 hover:bg-gray-50 shadow-lg'
                    : 'bg-white/[0.04] border border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {plan.cta}
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
