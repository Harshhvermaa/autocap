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
    title: 'Fast Caption Generation',
    description: 'Get your captions in seconds, not hours. Our AI processes audio at lightning speed.',
  },
  {
    icon: Target,
    title: 'Accurate Transcription',
    description: 'Industry-leading accuracy ensures your captions match the spoken content precisely.',
  },
  {
    icon: FileDown,
    title: 'SRT Download',
    description: 'Download standard .SRT subtitle files compatible with all major video platforms.',
  },
  {
    icon: Music,
    title: 'Multi-Format Audio Support',
    description: 'Upload MP3, WAV, or M4A files. We handle the conversion automatically.',
  },
  {
    icon: Eye,
    title: 'Clean Caption Preview',
    description: 'Review and verify your generated captions before downloading the final file.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    description: 'Generate captions on any device. Our platform works seamlessly on mobile and desktop.',
  },
];

export default function FeaturesSection() {
  return (
    <section className="relative py-24 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.10),_transparent_55%)]" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-300 tracking-wide uppercase mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Everything you need
          </h2>
          <p className="text-slate-400 mt-4 max-w-lg mx-auto">
            Powerful tools to make caption generation effortless and accurate.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group rounded-2xl p-6 border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/15 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:from-blue-500/25 group-hover:to-cyan-500/15 transition-colors">
                <feature.icon size={22} className="text-blue-300" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
