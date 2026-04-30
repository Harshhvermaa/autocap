import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
  });
} catch (e) {}

const HINGLISH_MODEL = process.env.HINGLISH_MODEL || 'gpt-4.1-mini';
const SERVER_BUILD = process.env.SERVER_BUILD || '2026-04-30';

const GLOSSARY_HINT = `Common words that may appear: ice cube, makeup, waxing, skin treatment, peel off, cool, pores, cotton, summer season, long lasting, facial, scrub, massage`;

function normalizeText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

function looksMostlyEnglish(text) {
  if (hasDevanagari(text)) return false;
  const lower = ` ${text.toLowerCase()} `;
  const hits = [
    ' the ',
    ' and ',
    ' is ',
    ' are ',
    ' of ',
    ' to ',
    ' in ',
    ' for ',
    ' with ',
    ' that ',
    ' this ',
    ' one ',
    ' other ',
  ].reduce((acc, w) => (lower.includes(w) ? acc + 1 : acc), 0);
  return hits >= 3;
}

function formatTimestamp(seconds) {
  if (seconds < 0) seconds = 0.0;
  let ms_total = Math.round(seconds * 1000);
  const hours = Math.floor(ms_total / 3600000);
  ms_total %= 3600000;
  const minutes = Math.floor(ms_total / 60000);
  ms_total %= 60000;
  const secs = Math.floor(ms_total / 1000);
  const millis = ms_total % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function clamp(value, minimum = 0.0) {
  return value > minimum ? value : minimum;
}

function adjustTiming(start, end) {
  start = clamp(start - 0.32);
  end = Math.max(start + 0.60, end + 0.12);
  return { start, end };
}

function splitTwoLines(text, maxCharsPerLine = 34) {
  const words = text.split(' ');
  if (!words.length || text.length <= maxCharsPerLine) return text;

  let bestSplit = -1;
  let bestDiff = 1000000000;

  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(' ');
    const right = words.slice(i).join(' ');
    if (left.length <= maxCharsPerLine && right.length <= maxCharsPerLine) {
      const diff = Math.abs(left.length - right.length);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSplit = i;
      }
    }
  }

  if (bestSplit !== -1) {
    const left = words.slice(0, bestSplit).join(' ');
    const right = words.slice(bestSplit).join(' ');
    return `${left}\n${right}`;
  }

  const midpoint = Math.floor(words.length / 2);
  const left = words.slice(0, midpoint).join(' ');
  const right = words.slice(midpoint).join(' ');
  return `${left}\n${right}`;
}

async function transliterateBatch(batch) {
  // Always convert to Roman Hinglish.
  // If Whisper produced English-looking text (likely translation), we convert it back to Hinglish.
  const payload = batch.map((seg, idx) => `${idx + 1}|||${seg.text}`).join('\n');

  const prompt = `You are a strict subtitle converter.

Task:
Convert each line into natural Roman Hinglish subtitles (Latin letters).

Rules:
1) Output MUST be Roman Hinglish (Latin letters). Never output Devanagari.
2) If the input contains Hindi in Devanagari, transliterate it (do NOT translate to English).
3) If the input is English (or English-heavy), convert it into natural Roman Hinglish while preserving meaning.
4) Keep English brand/product terms as-is (e.g., makeup, brush, pores, ice cube).
5) Do NOT add new information. Do NOT summarize.
6) Return exactly one output line for each input line.
7) Keep the same numbering before |||.
8) Output only plain text lines in the exact format: number|||converted text.

Examples:
1|||आज हम एक नई app के बारे में बात करेंगे
1|||aaj hum ek nayi app ke baare mein baat karenge

2|||Mainly makeup brushes are of two types. One is real hair brush and the other is synthetic hair brush.
2|||mainly makeup brushes do types ke hote hain. ek real hair brush hota hai aur dusra synthetic hair brush hota hai.

Input lines:
${payload}`;

  let output = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await openai.chat.completions.create({
      model: HINGLISH_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content:
            attempt === 0
              ? prompt
              : `${prompt}\n\nReminder: Do NOT translate to English. Output ONLY numbered lines in the exact format.`,
        },
      ],
    });
    output = response.choices[0].message.content?.trim() || '';
    if (output.includes('|||')) break;
  }

  const lines = output.split('\n').map(l => l.trim()).filter(l => l);

  const parsed = {};
  for (const line of lines) {
    if (line.includes('|||')) {
      const [left, ...rest] = line.split('|||');
      const right = normalizeText(rest.join('|||'));
      if (!isNaN(parseInt(left.trim()))) {
        parsed[parseInt(left.trim())] = right;
      }
    }
  }

  return batch.map((seg, idx) => parsed[idx + 1] || seg.text);
}

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set in .env' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Rename file to include original extension so OpenAI can detect format
    const originalName = req.file.originalname;
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    const audioPath = req.file.path + (ext || '.mp3');
    fs.renameSync(req.file.path, audioPath);

    // Step 1: Transcribe
    const result = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(audioPath),
      language: 'hi',
      prompt: `Transcribe (do NOT translate) this audio. It is mostly Hindi/Hinglish in informal spoken style. Write Hindi words in Devanagari script (हिन्दी) where possible. Keep English words, product names, and common beauty/skincare terms as spoken. Prefer words like: ${GLOSSARY_HINT}`,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      temperature: 0,
    });

    const rawSegments = result.segments || [];
    const segments = [];
    
    for (const seg of rawSegments) {
      const text = normalizeText(seg.text);
      if (text) {
        segments.push({ start: seg.start, end: seg.end, text });
      }
    }

    const devanagariCount = segments.reduce(
      (acc, s) => acc + (hasDevanagari(s.text) ? 1 : 0),
      0,
    );
    const mostlyEnglishCount = segments.reduce(
      (acc, s) => acc + (looksMostlyEnglish(s.text) ? 1 : 0),
      0,
    );
    console.log(
      `[transcribe] build=${SERVER_BUILD} segments=${segments.length} devanagari=${devanagariCount} mostlyEnglish=${mostlyEnglishCount} model=${HINGLISH_MODEL}`,
    );

    // Step 2: Convert to Hinglish
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < segments.length; i += batchSize) {
      batches.push(segments.slice(i, i + batchSize));
    }

    const convertedSegments = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const convertedLines = await transliterateBatch(batch);
      for (let j = 0; j < batch.length; j++) {
        convertedSegments.push({
          start: batch[j].start,
          end: batch[j].end,
          text: convertedLines[j],
        });
      }
    }

    // Step 3: Build frontend response
    const captions = convertedSegments.map((seg, index) => {
      const { start, end } = adjustTiming(seg.start, seg.end);
      const text = splitTwoLines(normalizeText(seg.text));
      return {
        id: index + 1,
        startTime: formatTimestamp(start),
        endTime: formatTimestamp(end),
        text: text
      };
    });

    // cleanup
    fs.unlinkSync(audioPath);

    res.json({ captions });
  } catch (error) {
    console.error('Transcription error:', error);
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT} (build=${SERVER_BUILD}, model=${HINGLISH_MODEL})`);
});
