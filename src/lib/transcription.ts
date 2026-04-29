export interface CaptionLine {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

const MOCK_CAPTIONS: CaptionLine[] = [
  { id: 1, startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Welcome to this audio presentation.' },
  { id: 2, startTime: '00:00:04,500', endTime: '00:00:08,000', text: 'Today we are going to discuss some important topics.' },
  { id: 3, startTime: '00:00:08,500', endTime: '00:00:12,000', text: 'Let me start by giving you a brief overview.' },
  { id: 4, startTime: '00:00:12,500', endTime: '00:00:16,000', text: 'The first point is about the current state of technology.' },
  { id: 5, startTime: '00:00:16,500', endTime: '00:00:20,000', text: 'We have seen tremendous growth in the past decade.' },
  { id: 6, startTime: '00:00:20,500', endTime: '00:00:24,000', text: 'Artificial intelligence is transforming every industry.' },
  { id: 7, startTime: '00:00:24,500', endTime: '00:00:28,000', text: 'From healthcare to education, the impact is significant.' },
  { id: 8, startTime: '00:00:28,500', endTime: '00:00:32,000', text: 'Now let us look at some specific examples.' },
  { id: 9, startTime: '00:00:32,500', endTime: '00:00:36,000', text: 'In healthcare, AI helps with early disease detection.' },
  { id: 10, startTime: '00:00:36,500', endTime: '00:00:40,000', text: 'In education, personalized learning is becoming a reality.' },
  { id: 11, startTime: '00:00:40,500', endTime: '00:00:44,000', text: 'These are just a few of the many applications.' },
  { id: 12, startTime: '00:00:44,500', endTime: '00:00:48,000', text: 'Thank you for listening to this presentation.' },
];

export function generateMockCaptions(): CaptionLine[] {
  return MOCK_CAPTIONS;
}

export function captionsToSRT(captions: CaptionLine[]): string {
  return captions
    .map((c) => `${c.id}\n${c.startTime} --> ${c.endTime}\n${c.text}`)
    .join('\n\n');
}

export function downloadSRT(captions: CaptionLine[], filename = 'captions.srt') {
  const srtContent = captionsToSRT(captions);
  const blob = new Blob([srtContent], { type: 'text/srt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function processAudio(file: File): Promise<CaptionLine[]> {
  const formData = new FormData();
  formData.append('audio', file);

  const apiBase =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
  const url = apiBase ? `${apiBase.replace(/\/$/, '')}/api/transcribe` : '/api/transcribe';

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to process audio');
  }

  const data = await response.json();
  return data.captions;
}
