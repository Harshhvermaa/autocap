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

const GLOSSARY_HINT = `Common words that may appear: ice cube, makeup, waxing, skin treatment, peel off, cool, pores, cotton, summer season, long lasting, facial, scrub, massage`;

function normalizeText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
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
  // If Whisper already gave Roman/English text (no Devanagari), do not call the LLM:
  // calling the model sometimes "translates" instead of transliterating.
  const indicesToConvert = [];
  const numbered = [];
  for (let i = 0; i < batch.length; i++) {
    const seg = batch[i];
    if (hasDevanagari(seg.text)) {
      indicesToConvert.push(i);
      numbered.push(`${indicesToConvert.length}|||${seg.text}`);
    }
  }

  if (indicesToConvert.length === 0) {
    return batch.map((seg) => seg.text);
  }

  const payload = numbered.join('\n');

  const prompt = `You are a strict subtitle transliterator.

Task:
Convert each line into natural Roman Hinglish.

Rules:
1. Transliterate only. Do NOT translate to English.
2. Do NOT paraphrase or rewrite sentence structure.
3. Do NOT improve grammar.
4. Do NOT shorten or expand the text.
5. Keep English words exactly as they are.
6. Convert Hindi/Urdu words into simple natural Roman script (Hinglish).
7. If a line is already in Latin script (Roman), keep it EXACTLY as-is (only normalize spacing).
8. DO NOT translate. If you translate even one line, the output is wrong.
9. Preserve product/style/brand words if already in English.
10. Return exactly one output line for each input line.
11. Keep the same numbering before |||.
12. Output only plain text in this exact format: number|||converted text.

Examples:
1|||आज हम एक नई app के बारे में बात करेंगे
1|||aaj hum ek nayi app ke baare mein baat karenge

2|||इससे हमारे pores close हो जाएंगे
2|||isse hamare pores close ho jayenge

3|||वैक्सिंग के बाद ice cube use करो
3|||waxing ke baad ice cube use karo

4|||mainly makeup brushes do types ke hote hain, ek real hair brush aur ek synthetic hair brush
4|||mainly makeup brushes do types ke hote hain, ek real hair brush aur ek synthetic hair brush

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

  const out = batch.map((seg) => seg.text);
  for (let i = 0; i < indicesToConvert.length; i++) {
    const originalIndex = indicesToConvert[i];
    out[originalIndex] = parsed[i + 1] || batch[originalIndex].text;
  }
  return out;
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
      prompt: `This audio is mostly Hindi/Hinglish in informal spoken style. Write Hindi words in Devanagari script (हिन्दी) where possible. Keep English words, product names, and common beauty/skincare terms as spoken. Prefer words like: ${GLOSSARY_HINT}`,
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
  console.log(`Backend running on port ${PORT}`);
});
