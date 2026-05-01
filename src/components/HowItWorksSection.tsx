import { Upload, Cpu, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload',
    description: 'Drag & drop your MP3, WAV, or M4A file.',
    number: '01',
  },
  {
    icon: Cpu,
    title: 'AI Processes',
    description: 'Our engine transcribes and aligns timestamps automatically.',
    number: '02',
  },
  {
    icon: Download,
    title: 'Download SRT',
    description: 'Preview, edit, and download your ready-to-use subtitle file.',
    number: '03',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-400 tracking-[0.2em] uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Three steps. That's it.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-7 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500"
            >
              {/* Number */}
              <span className="absolute top-5 right-6 text-5xl font-black text-white/[0.03] group-hover:text-white/[0.06] transition-colors duration-500 select-none">
                {step.number}
              </span>

              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/15 to-blue-500/10 border border-white/[0.08] flex items-center justify-center mb-5 group-hover:from-violet-500/25 group-hover:to-blue-500/15 transition-all duration-500">
                <step.icon size={18} className="text-violet-300" />
              </div>

              <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
