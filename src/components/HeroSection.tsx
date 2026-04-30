import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { processAudio, downloadSRT, type CaptionLine } from '../lib/transcription';
import AuthModal from './AuthModal';
import {
  Upload,
  FileAudio,
  Download,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  Wand2,
  PencilLine,
  ArrowRight,
} from 'lucide-react';

const ACCEPTED_FORMATS = ['.mp3', '.wav', '.m4a'];
type Screen = 'upload' | 'processing' | 'results';

export default function HeroSection() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [captions, setCaptions] = useState<CaptionLine[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [screen, setScreen] = useState<Screen>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FORMATS.includes(ext)) {
      alert('Unsupported format. Please upload MP3, WAV, or M4A files.');
      return;
    }
    setFile(selectedFile);
    setCaptions(null);
    setScreen('upload');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleGenerate = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!file) return;

    setProcessing(true);
    setScreen('processing');
    setProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const result = await processAudio(file);
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setCaptions(result);
        setProcessing(false);
        setProgress(0);
        setScreen('results');
      }, 400);
    } catch {
      clearInterval(progressInterval);
      setProcessing(false);
      setProgress(0);
      setScreen('upload');
    }
  };

  const handleDownload = () => {
    if (!captions) return;
    const baseName = file?.name.replace(/\.[^.]+$/, '') ?? 'captions';
    downloadSRT(captions, `${baseName}.srt`);
  };

  const updateCaptionText = (id: number, text: string) => {
    setCaptions((prev) => {
      if (!prev) return prev;
      return prev.map((line) => (line.id === id ? { ...line, text } : line));
    });
  };

  const reset = () => {
    setFile(null);
    setCaptions(null);
    setProcessing(false);
    setProgress(0);
    setScreen('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.15),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(6,182,212,0.1),_transparent_50%)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div
        className={`relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center ${
          screen === 'processing' ? 'py-10' : 'py-20'
        }`}
      >
        {screen === 'upload' && (
          <>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-blue-300 mb-8 backdrop-blur-sm">
              <Sparkles size={14} />
              AI-Powered Caption Generation
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Generate Captions from
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Audio in Seconds
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Upload your audio and get accurate SRT subtitles instantly. No manual transcription needed.
            </p>
          </>
        )}

        {/* Upload + Processing + Results */}
        <div className="max-w-3xl mx-auto">
          {screen === 'upload' && (
            <div
              className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
                dragOver
                  ? 'border-blue-400 bg-blue-500/10'
                  : file
                  ? 'border-cyan-500/50 bg-cyan-500/5'
                  : 'border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/[0.07]'
              } backdrop-blur-sm p-8`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <FileAudio size={24} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">{file.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="ml-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                    <Upload size={28} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      Drop your audio file here
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                      or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                      >
                        browse files
                      </button>
                    </p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {['MP3', 'WAV', 'M4A'].map((fmt) => (
                      <span
                        key={fmt}
                        className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-slate-400"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FORMATS.join(',')}
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFileSelect(selected);
                }}
              />
            </div>
          )}

          {screen === 'upload' && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={!file || processing}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate SRT
                  </>
                )}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/15 text-white font-medium rounded-xl hover:bg-white/10 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Choose another file
              </button>
            </div>
          )}

          {screen === 'processing' && (
            <div className="min-h-[75vh] flex items-center">
              <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 sm:p-10 text-left">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-blue-200">
                      <Wand2 size={14} />
                      AI Processing
                    </div>
                    <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Generating captions…
                    </h2>
                    <p className="mt-2 text-slate-400 text-sm sm:text-base">
                      {progress < 50
                        ? 'Uploading your audio securely.'
                        : 'Transcribing speech and aligning timestamps.'}
                    </p>
                  </div>

                  <div className="hidden sm:block relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/10 blur-xl" />
                    <div className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 size={28} className="text-blue-300 animate-spin" />
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{Math.round(Math.min(progress, 100))}%</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                      Neural engine online
                    </span>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    { title: 'Upload', desc: 'Chunking audio stream' },
                    { title: 'Transcribe', desc: 'Speech → text' },
                    { title: 'Align', desc: 'Timestamps → captions' },
                  ].map((step) => (
                    <div
                      key={step.title}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                    >
                      <p className="text-white text-sm font-semibold">{step.title}</p>
                      <p className="text-slate-400 text-xs mt-1">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {screen === 'results' && captions && (
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-emerald-300 mb-8 backdrop-blur-sm">
                <CheckCircle2 size={14} />
                Captions ready
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Review & download your SRT
              </h1>
              <p className="mt-3 text-slate-400 max-w-2xl">
                Edit any line before downloading. Changes apply to the exported `.srt` file.
              </p>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-white/10 flex items-center justify-center">
                      <FileAudio size={18} className="text-blue-300" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">
                        {file?.name ?? 'Audio'}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {captions.length} caption lines
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <button
                      onClick={handleDownload}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Download size={18} />
                      Download .SRT
                    </button>
                    <button
                      onClick={reset}
                      className="w-full sm:w-auto px-6 py-3 bg-white/5 border border-white/15 text-white font-medium rounded-xl hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      Upload another
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-3">
                  {captions.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-xs text-slate-400 font-mono">
                          {c.startTime} → {c.endTime}
                        </div>
                        <div className="inline-flex items-center gap-2 text-xs text-blue-200">
                          <PencilLine size={14} />
                          Edit
                        </div>
                      </div>
                      <textarea
                        value={c.text}
                        onChange={(e) => updateCaptionText(c.id, e.target.value)}
                        rows={2}
                        className="mt-3 w-full bg-transparent text-slate-200 placeholder:text-slate-500 text-sm outline-none border border-white/10 rounded-lg px-3 py-2 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20 resize-y"
                        placeholder="Caption text…"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
