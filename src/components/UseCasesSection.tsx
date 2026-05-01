import {
  Youtube,
  Mic,
  GraduationCap,
  Building2,
  Share2,
} from 'lucide-react';

const useCases = [
  {
    icon: Youtube,
    title: 'YouTubers',
    description: 'Add subtitles for better reach and accessibility.',
  },
  {
    icon: Mic,
    title: 'Podcasters',
    description: 'Transcribe episodes for show notes and SEO.',
  },
  {
    icon: GraduationCap,
    title: 'Course Creators',
    description: 'Make online courses accessible with captions.',
  },
  {
    icon: Building2,
    title: 'Agencies',
    description: 'Scale caption production across client projects.',
  },
  {
    icon: Share2,
    title: 'Social Creators',
    description: 'Captions for reels, stories, and shorts.',
  },
];

export default function UseCasesSection() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12">
          {/* Left — Sticky headline */}
          <div className="lg:sticky lg:top-32 lg:max-w-xs shrink-0">
            <p className="text-xs font-semibold text-violet-400 tracking-[0.2em] uppercase mb-4">
              Use Cases
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Built for
              <br />
              creators.
            </h2>
            <p className="text-white/35 mt-4 text-sm leading-relaxed">
              Whether you're a solo creator or an agency, Autocap fits your workflow.
            </p>
          </div>

          {/* Right — Cards */}
          <div className="flex-1 grid sm:grid-cols-2 gap-4 lg:max-w-lg">
            {useCases.map((uc, i) => (
              <div
                key={i}
                className="group rounded-2xl p-5 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center mb-3 shadow-sm shadow-violet-500/10 group-hover:shadow-md group-hover:shadow-violet-500/20 group-hover:scale-105 transition-all duration-500">
                  <uc.icon size={18} className="text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{uc.title}</h3>
                <p className="text-white/35 text-xs leading-relaxed">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
