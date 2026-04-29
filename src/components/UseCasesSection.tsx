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
    description: 'Add subtitles to your videos for better reach and accessibility.',
  },
  {
    icon: Mic,
    title: 'Podcasters',
    description: 'Transcribe episodes into readable captions for show notes and SEO.',
  },
  {
    icon: GraduationCap,
    title: 'Course Creators',
    description: 'Make online courses accessible with accurate caption files.',
  },
  {
    icon: Building2,
    title: 'Agencies',
    description: 'Scale caption production across multiple client projects efficiently.',
  },
  {
    icon: Share2,
    title: 'Social Media Creators',
    description: 'Create engaging captions for reels, stories, and short-form content.',
  },
];

export default function UseCasesSection() {
  return (
    <section className="relative py-24 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.10),_transparent_55%)]" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-300 tracking-wide uppercase mb-3">
            Use Cases
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Built for creators
          </h2>
          <p className="text-slate-400 mt-4 max-w-lg mx-auto">
            Whether you are a solo creator or an agency, CaptionCraft fits your workflow.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((uc, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-6 border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/15 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <uc.icon size={22} className="text-white" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{uc.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{uc.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
