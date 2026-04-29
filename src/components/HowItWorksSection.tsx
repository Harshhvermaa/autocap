import { Upload, Cpu, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload your audio',
    description: 'Drag and drop or browse your MP3, WAV, or M4A file into the upload box.',
    color: 'from-blue-500 to-blue-600',
    glow: 'blue',
  },
  {
    icon: Cpu,
    title: 'AI converts speech to captions',
    description: 'Our AI engine transcribes your audio into perfectly timed caption blocks.',
    color: 'from-cyan-500 to-teal-500',
    glow: 'cyan',
  },
  {
    icon: Download,
    title: 'Download SRT file',
    description: 'Preview your captions and download the ready-to-use .SRT subtitle file.',
    color: 'from-teal-500 to-emerald-500',
    glow: 'emerald',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="relative py-24 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(6,182,212,0.10),_transparent_55%)]" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-300 tracking-wide uppercase mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Three simple steps
          </h2>
          <p className="text-slate-400 mt-4 max-w-lg mx-auto">
            From audio upload to SRT download in under a minute.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-blue-500/30 via-cyan-500/30 to-teal-500/30" />

          {steps.map((step, i) => (
            <div key={i} className="relative text-center group">
              <div className="relative inline-flex mb-6">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}
                  style={{
                    boxShadow: `0 8px 30px rgba(${
                      step.glow === 'blue'
                        ? '59,130,246'
                        : step.glow === 'cyan'
                        ? '6,182,212'
                        : '16,185,129'
                    }, 0.25)`,
                  }}
                >
                  <step.icon size={28} className="text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-slate-950 border border-white/10 rounded-full flex items-center justify-center text-xs font-bold text-slate-200 shadow-sm">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
