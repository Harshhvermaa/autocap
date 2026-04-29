import { Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';
import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out CaptionCraft',
    features: [
      '3 audio files per month',
      'MP3, WAV, M4A support',
      'SRT file download',
      'Caption preview',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For creators who need unlimited captions',
    features: [
      'Unlimited audio files',
      'MP3, WAV, M4A support',
      'SRT file download',
      'Caption preview',
      'Priority processing',
      'Email support',
    ],
    cta: 'Start Generating',
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
    <section className="relative py-24 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.10),_transparent_55%)]" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-300 tracking-wide uppercase mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-400 mt-4 max-w-lg mx-auto">
            Start free and upgrade when you need more.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/20 scale-[1.02]'
                  : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/15 hover:shadow-lg hover:shadow-blue-500/10'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-blue-600 text-xs font-bold rounded-full shadow-sm">
                  MOST POPULAR
                </span>
              )}
              <h3
                className={`text-lg font-semibold mb-1 ${
                  plan.highlighted ? 'text-white' : 'text-white'
                }`}
              >
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span
                  className={`text-4xl font-bold ${
                    plan.highlighted ? 'text-white' : 'text-white'
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ${
                    plan.highlighted ? 'text-white/70' : 'text-slate-400'
                  }`}
                >
                  {plan.period}
                </span>
              </div>
              <p
                className={`text-sm mb-6 ${
                  plan.highlighted ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <Check
                      size={16}
                      className={
                        plan.highlighted ? 'text-white' : 'text-blue-300'
                      }
                    />
                    <span
                      className={
                        plan.highlighted ? 'text-white/90' : 'text-slate-300'
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleCta}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                  plan.highlighted
                    ? 'bg-white text-blue-600 hover:bg-gray-50 shadow-lg'
                    : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
