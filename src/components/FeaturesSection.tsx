import {
  Zap,
  Target,
  FileDown,
  Music,
  Eye,
  Smartphone,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Blazing Fast',
    description: 'Get captions in seconds. No queues, no waiting.',
  },
  {
    icon: Target,
    title: 'High Accuracy',
    description: 'Industry-leading transcription that matches spoken content precisely.',
  },
  {
    icon: FileDown,
    title: 'SRT Export',
    description: 'Standard .SRT format compatible with YouTube, Premiere, and more.',
  },
  {
    icon: Music,
    title: 'Multi-Format',
    description: 'Upload MP3, WAV, or M4A — we handle the rest.',
  },
  {
    icon: Eye,
    title: 'Live Preview',
    description: 'Review and edit every caption line before downloading.',
  },
  {
    icon: Smartphone,
    title: 'Works Everywhere',
    description: 'Desktop or mobile — generate captions from any device.',
  },
];

export default function FeaturesSection() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Soft accent glow */}
      <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/[0.05] blur-[100px]" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-400 tracking-[0.2em] uppercase mb-4">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Everything you need
          </h2>
          <p className="text-white/35 mt-4 max-w-md mx-auto text-sm">
            Powerful tools wrapped in a simple interface.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group rounded-2xl p-6 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500/15 to-blue-500/10 border border-white/[0.08] rounded-xl flex items-center justify-center mb-4 group-hover:from-violet-500/25 group-hover:to-blue-500/15 transition-all duration-500">
                <feature.icon size={18} className="text-violet-300" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                {feature.title}
              </h3>
              <p className="text-white/35 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
