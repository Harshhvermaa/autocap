import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What audio formats are supported?',
    answer:
      'Autocap supports MP3, WAV, and M4A audio formats — covering the vast majority of audio files used in content creation, podcasting, and video production.',
  },
  {
    question: 'What is an SRT file?',
    answer:
      'An SRT (SubRip Text) file is a standard subtitle format with sequentially numbered caption blocks and timestamps. It works with YouTube, Vimeo, VLC, and virtually every video player.',
  },
  {
    question: 'How accurate are the generated captions?',
    answer:
      'Our AI delivers high-accuracy transcriptions. Clean, well-recorded audio typically achieves 95%+ accuracy. Results depend on audio quality, background noise, and speaker clarity.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'Yes, a free account is needed to generate captions. This helps us manage usage limits and keep your files secure.',
  },
  {
    question: "What's the difference between Free and Pro?",
    answer:
      'Free gives you 3 audio files per month. Pro removes this limit entirely — unlimited generation, priority processing, and email support.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-violet-400 tracking-[0.2em] uppercase mb-4">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Questions? Answered.
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-white/[0.06] bg-white/[0.02] rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-white/80 font-medium text-sm pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-white/25 shrink-0 transition-transform duration-300 ${
                    openIndex === i ? 'rotate-180 text-violet-400' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? 'max-h-48' : 'max-h-0'
                }`}
              >
                <p className="px-5 pb-4 text-white/35 text-sm leading-relaxed">
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
