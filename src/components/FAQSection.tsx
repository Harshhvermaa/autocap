import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What audio formats are supported?',
    answer:
      'Autocap supports MP3, WAV, and M4A audio formats. These cover the vast majority of audio files used in content creation, podcasting, and video production.',
  },
  {
    question: 'What is an SRT file?',
    answer:
      'An SRT (SubRip Text) file is a standard subtitle format that contains sequentially numbered caption blocks with timestamps and text. It is compatible with YouTube, Vimeo, VLC, and virtually every video player and platform.',
  },
  {
    question: 'How accurate are the generated captions?',
    answer:
      'Our AI engine delivers high-accuracy transcriptions suitable for most professional use cases. Accuracy depends on audio quality, background noise, and speaker clarity. Clean, well-recorded audio typically achieves 95%+ accuracy.',
  },
  {
    question: 'Do I need to create an account to use Autocap?',
    answer:
      'Yes, you need a free account to generate captions. This helps us manage usage limits on the free plan and ensures your generated files are securely associated with your account.',
  },
  {
    question: 'What is the difference between Free and Pro plans?',
    answer:
      'The Free plan lets you generate captions for up to 3 audio files per month. The Pro plan removes this limit entirely, giving you unlimited caption generation plus priority processing and email support.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-24 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(6,182,212,0.10),_transparent_55%)]" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-300 tracking-wide uppercase mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-white/10 bg-white/[0.03] rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/[0.05] hover:border-white/15"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-white font-medium text-sm pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 shrink-0 transition-transform duration-300 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? 'max-h-48' : 'max-h-0'
                }`}
              >
                <p className="px-6 pb-5 text-slate-400 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
