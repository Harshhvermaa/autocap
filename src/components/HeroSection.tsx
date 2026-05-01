import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { processAudio, downloadSRT, type CaptionLine } from '../lib/transcription';
import AuthModal from './AuthModal';
import {
  Upload, FileAudio, Download, Loader2, X, Sparkles,
  Wand2, PencilLine, ArrowRight, Mic, Zap,
} from 'lucide-react';

const ACCEPTED_FORMATS = ['.mp3', '.wav', '.m4a'];
type Screen = 'upload' | 'processing' | 'results';
type HeroSectionProps = { screen: Screen; onScreenChange: (screen: Screen) => void };

function parseSrtTimestamp(ts: string): number {
  const m = ts.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
}

function formatSrtTimestamp(seconds: number): string {
  const s = Math.max(0, seconds);
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(mil).padStart(3,'0')}`;
}

function splitCaptionByWords(caption: CaptionLine, wpb: number): CaptionLine[] {
  const cleaned = caption.text.replace(/\n+/g,' ').trim().replace(/\s+/g,' ');
  if (!cleaned) return [];
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length <= wpb) return [{ ...caption, text: cleaned }];
  const startSec = parseSrtTimestamp(caption.startTime);
  const endSec = parseSrtTimestamp(caption.endTime);
  const dur = Math.max(0.001, endSec - startSec);
  const blocks: CaptionLine[] = [];
  for (let i = 0; i < words.length; i += wpb) {
    const chunk = words.slice(i, i + wpb);
    const cs = startSec + (dur * i) / words.length;
    const ce = i + wpb >= words.length ? endSec : startSec + (dur * (i + chunk.length)) / words.length;
    blocks.push({ ...caption, id: 0, startTime: formatSrtTimestamp(Math.min(cs, endSec - 0.001)), endTime: formatSrtTimestamp(Math.max(cs + 0.001, Math.min(ce, endSec))), text: chunk.join(' ') });
  }
  return blocks;
}

function splitCaptionsByWords(captions: CaptionLine[], wpb: number) {
  const next: CaptionLine[] = [];
  for (const c of captions) next.push(...splitCaptionByWords(c, wpb));
  return next.map((c, idx) => ({ ...c, id: idx + 1 }));
}

export default function HeroSection({ screen, onScreenChange }: HeroSectionProps) {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [captions, setCaptions] = useState<CaptionLine[] | null>(null);
  const [originalCaptions, setOriginalCaptions] = useState<CaptionLine[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [splitWordsPerBlock, setSplitWordsPerBlock] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setScreenSafe = (next: Screen) => onScreenChange(next);

  const handleFileSelect = (selectedFile: File) => {
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FORMATS.includes(ext)) { alert('Please upload MP3, WAV, or M4A files.'); return; }
    setFile(selectedFile); setCaptions(null); setError(null); setScreenSafe('upload');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f);
  };

  const handleGenerate = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    if (!file) return;
    setProcessing(true); setScreenSafe('processing'); setProgress(0); setError(null);
    const iv = setInterval(() => setProgress((p) => { if (p >= 90) { clearInterval(iv); return 90; } return p + Math.random() * 15; }), 200);
    try {
      const result = await processAudio(file);
      clearInterval(iv); setProgress(100);
      setTimeout(() => { setOriginalCaptions(result); setCaptions(result); setProcessing(false); setProgress(0); setScreenSafe('results'); }, 400);
    } catch (err: unknown) {
      clearInterval(iv); setProcessing(false); setProgress(0);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setScreenSafe('upload');
    }
  };

  const handleDownload = () => { if (!captions) return; downloadSRT(captions, `${file?.name.replace(/\.[^.]+$/, '') ?? 'captions'}.srt`); };
  const applyWordSplit = () => { if (captions && splitWordsPerBlock) setCaptions(splitCaptionsByWords(captions, splitWordsPerBlock)); };
  const restoreOriginal = () => { if (originalCaptions) setCaptions(originalCaptions); };
  const updateCaptionText = (id: number, text: string) => setCaptions((prev) => prev ? prev.map((l) => l.id === id ? { ...l, text } : l) : prev);
  const reset = () => { setFile(null); setCaptions(null); setOriginalCaptions(null); setProcessing(false); setProgress(0); setError(null); setScreenSafe('upload'); setSplitWordsPerBlock(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  return (
    <section className={`relative overflow-hidden ${screen === 'results' ? 'h-screen pt-20 pb-6' : 'min-h-screen flex items-center pt-16'}`}>
      {/* BG */}
      <div className="absolute inset-0 bg-[#08080d]" />
      <div className="absolute top-[-25%] left-[-10%] w-[700px] h-[700px] rounded-full bg-violet-600/15 blur-[140px] animate-float" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px] animate-float-delayed" />
      <div className="absolute inset-0 noise-bg" />

      <div className={`relative z-10 w-full ${screen === 'results' ? 'px-6 sm:px-10 lg:px-14 pt-4' : 'px-6 sm:px-10 lg:px-16 py-12'}`}>

        {/* ═══ UPLOAD — Left/Right Split ═══ */}
        {screen === 'upload' && (
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[70vh]">
            {/* LEFT — Text */}
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-full text-sm text-violet-300 mb-6">
                <Sparkles size={14} />
                AI-Powered Captions
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-5">
                Audio to
                <br />
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  captions,
                </span>
                <br />
                instantly.
              </h1>

              <p className="text-lg text-white/40 max-w-md mb-8 leading-relaxed">
                Upload any audio file and get perfectly timed SRT subtitles in seconds. Hindi, English, or Hinglish — we handle it all.
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-white/25">
                <span className="flex items-center gap-2"><Zap size={16} className="text-violet-400/60" /> Fast processing</span>
                <span className="flex items-center gap-2"><Mic size={16} className="text-blue-400/60" /> Hindi + English</span>
                <span className="flex items-center gap-2"><Download size={16} className="text-cyan-400/60" /> SRT export</span>
              </div>
            </div>

            {/* RIGHT — Upload Card */}
            <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
              {error && (
                <div className="mb-5 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div
                className={`rounded-3xl border-2 border-dashed transition-all duration-300 ${
                  dragOver ? 'border-violet-400 bg-violet-500/10'
                  : file ? 'border-cyan-400/30 bg-white/[0.04]'
                  : 'border-white/[0.08] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.04]'
                } p-8 sm:p-10`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.06]">
                      <FileAudio size={24} className="text-violet-300" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-white font-semibold text-base truncate">{file.name}</p>
                      <p className="text-white/30 text-sm mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB · Ready</p>
                    </div>
                    <button onClick={reset} className="text-white/25 hover:text-white transition-colors p-2"><X size={20} /></button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-5 py-6 cursor-pointer">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      <Upload size={28} className="text-white/35" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/70 font-semibold text-lg">Drop your audio file here</p>
                      <p className="text-white/30 text-sm mt-2">
                        or <span className="text-violet-400 underline underline-offset-2">browse files</span>
                      </p>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {['MP3', 'WAV', 'M4A'].map((f) => (
                        <span key={f} className="px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/30 text-xs font-medium">{f}</span>
                      ))}
                    </div>
                  </button>
                )}

                <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS.join(',')} className="hidden"
                  onChange={(e) => { const s = e.target.files?.[0]; if (s) handleFileSelect(s); }} />
              </div>

              {/* Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button onClick={handleGenerate} disabled={!file || processing}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold rounded-2xl text-base hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2.5">
                  {processing ? (<><Loader2 size={20} className="animate-spin" /> Processing…</>) : (<><Sparkles size={20} /> Generate Captions</>)}
                </button>
                {file && (
                  <button onClick={() => fileInputRef.current?.click()} disabled={processing}
                    className="px-6 py-4 bg-white/[0.04] border border-white/10 text-white/60 font-semibold rounded-2xl text-base hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    Change
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PROCESSING ═══ */}
        {screen === 'processing' && (
          <div className="min-h-[75vh] flex items-center justify-center">
            <div className="max-w-lg mx-auto text-center">
              <div className="relative w-32 h-32 mx-auto mb-10">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/20 blur-3xl animate-pulse-glow" />
                <div className="absolute inset-3 rounded-full bg-[#08080d] border border-white/10" />
                <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={36} className="text-violet-300 animate-spin" /></div>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-violet-200 mb-5"><Wand2 size={14} /> AI Processing</div>
              <h2 className="text-3xl font-bold text-white mb-3">Generating captions…</h2>
              <p className="text-white/35 text-base mb-10">{progress < 50 ? 'Uploading and analyzing audio.' : 'Transcribing and aligning timestamps.'}</p>
              <div className="max-w-sm mx-auto">
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-blue-400 rounded-full transition-all duration-300" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-sm text-white/25">
                  <span>{Math.round(Math.min(progress, 100))}%</span>
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400/70 animate-pulse" /> Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ RESULTS ═══ */}
        {screen === 'results' && captions && (
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1">Review & download your SRT</h1>
            <p className="mt-3 text-white/35 max-w-2xl mx-auto">Edit any line before downloading.</p>

            <div className="mt-6 w-full text-left rounded-2xl border border-white/10 bg-white/95 shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-220px)]">
              <div className="px-6 py-5 border-b border-slate-200/70">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-md"><FileAudio size={20} className="text-white" /></div>
                    <div>
                      <p className="text-slate-900 text-sm font-semibold">{file?.name ?? 'Audio'}</p>
                      <p className="text-slate-500 text-xs">{captions.length} caption lines</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm min-w-[220px]">
                      <span className="text-slate-600">Split (words)</span>
                      <select value={splitWordsPerBlock ?? 'off'} onChange={(e) => setSplitWordsPerBlock(e.target.value === 'off' ? null : Number(e.target.value))} className="bg-transparent text-slate-900 outline-none">
                        <option value="off">Off</option>
                        {[3,4,5,6,7,8,10,12].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                    <button onClick={applyWordSplit} disabled={!splitWordsPerBlock} className="px-5 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50 text-sm">Apply</button>
                    <button onClick={restoreOriginal} disabled={!originalCaptions} className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm">Restore</button>
                    <button onClick={handleDownload} className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold hover:shadow-lg transition-all flex items-center gap-2 text-sm"><Download size={16} /> Download .SRT</button>
                    <button onClick={reset} className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm">New file <ArrowRight size={14} /></button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 sm:p-6 space-y-3">
                  {captions.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
                      <div className="grid grid-cols-1 sm:grid-cols-[64px_220px_1fr_auto] lg:grid-cols-[64px_260px_1fr_auto] gap-3 sm:items-center">
                        <div className="w-12 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">{c.id}</div>
                        <div className="text-xs text-slate-600 font-mono">{c.startTime} → {c.endTime}</div>
                        <textarea value={c.text} onChange={(e) => updateCaptionText(c.id, e.target.value)} rows={2}
                          className="w-full min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 resize-y" placeholder="Caption text…" />
                        <div className="inline-flex items-center gap-2 text-sm text-violet-600 justify-self-start sm:justify-self-end select-none"><PencilLine size={16} /> Edit</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
