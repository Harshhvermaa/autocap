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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, build: SERVER_BUILD, model: HINGLISH_MODEL, pid: process.pid });
});

let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
  });
} catch (e) { }

const HINGLISH_MODEL = process.env.HINGLISH_MODEL || 'gpt-4.1-mini';
const SERVER_BUILD = '2026-05-02';

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
    ' the ', ' and ', ' is ', ' are ', ' of ',
    ' to ', ' in ', ' for ', ' with ', ' that ',
    ' this ', ' one ', ' other ',
  ].reduce((acc, w) => (lower.includes(w) ? acc + 1 : acc), 0);
  return hits >= 3;
}

// ─── NEW: detect majority language from segments ────────────────────────────
function detectLanguage(segments) {
  const total = segments.length;
  if (!total) return 'hi';

  const hindiCount = segments.reduce(
    (acc, s) => acc + (hasDevanagari(s.text) ? 1 : 0),
    0,
  );
  const ratio = hindiCount / total;
  // Use 0.15 threshold — even 15% Devanagari means Hindi/Hinglish audio
  // Prevents English audio from being misclassified as Hindi
  const detected = ratio > 0.15 ? 'hi' : 'en';
  console.log(
    `[detectLanguage] devanagari=${hindiCount}/${total} ratio=${ratio.toFixed(2)} → '${detected}'`,
  );
  return detected;
}
// ────────────────────────────────────────────────────────────────────────────

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

function enforceNoOverlap(segments, gap = 0.06, minDuration = 0.6) {
  const next = [];
  let prevEnd = 0;
  for (const seg of segments) {
    let start = Number(seg.start);
    let end = Number(seg.end);
    if (!Number.isFinite(start)) start = prevEnd;
    if (!Number.isFinite(end)) end = start + minDuration;

    start = Math.max(start, prevEnd + gap);
    end = Math.max(end, start + minDuration);

    next.push({ ...seg, start, end });
    prevEnd = end;
  }
  return next;
}

function mergeTinySegments(
  segments,
  { minDuration = 0.9, maxCombinedDuration = 3.8, maxChars = 70 } = {},
) {
  if (!segments.length) return [];

  const merged = [];
  let i = 0;

  while (i < segments.length) {
    const current = { ...segments[i] };
    const duration = current.end - current.start;

    if (i < segments.length - 1) {
      const next = segments[i + 1];
      const combinedDuration = next.end - current.start;
      const combinedText = normalizeText(`${current.text} ${next.text}`);

      if (
        duration < minDuration &&
        combinedDuration <= maxCombinedDuration &&
        combinedText.length <= maxChars
      ) {
        current.end = next.end;
        current.text = combinedText;
        i += 1;
      }
    }

    merged.push(current);
    i += 1;
  }

  return merged;
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
  return `${words.slice(0, midpoint).join(' ')}\n${words.slice(midpoint).join(' ')}`;
}

function protectEnglishTokens(text) {
  const map = new Map();
  let i = 0;
  const replaced = text.replace(
    /\b[A-Za-z][A-Za-z0-9''\-]*(?:\s+[A-Za-z][A-Za-z0-9''\-]*)*\b/g,
    (match) => {
      const words = match.trim().split(/\s+/).filter(Boolean);
      if (words.length > 3 || match.length > 24) return match;
      const key = `[[EN${i++}]]`;
      map.set(key, match);
      return key;
    },
  );
  return { text: replaced, map };
}

function restoreEnglishTokens(text, map) {
  let out = text;
  for (const [key, value] of map.entries()) {
    const tokenId = key.replace(/^\[\[|\]\]$/g, '');
    const patterns = [
      key,
      key.replace(/\[\[/g, '__').replace(/\]\]/g, '__'),
      tokenId,
      `[[ ${tokenId} ]]`,
      `__ ${tokenId} __`,
    ];
    for (const p of patterns) out = out.split(p).join(value);
  }
  return out;
}

// ─── Simple transliteration: just convert to Roman Hinglish ─────────────────
async function transliterateBatchToHinglish(batch) {
  const protections = batch.map((seg) => protectEnglishTokens(seg.text));
  const payload = protections.map((p, idx) => `${idx + 1}|||${p.text}`).join('\n');

  const prompt = `
You are a strict subtitle transliterator.

Task:
Convert each line into Roman Hinglish script. Write EXACTLY what was spoken, just in Roman letters.

CRITICAL RULES:
1. This is TRANSLITERATION, not translation. Write the SAME words, just in Roman script.
2. Hindi/Urdu words in Devanagari → convert to Roman script (e.g. "मैं" → "main", "करो" → "karo")
3. English words → keep EXACTLY as they are. Do NOT change them. Do NOT translate them to Hindi.
4. Do NOT add any extra words. Do NOT remove any words.
5. Do NOT paraphrase. Do NOT summarize. Do NOT rephrase.
6. Do NOT change the meaning or sentence structure.
7. Keep placeholders like [[EN0]] unchanged.
8. Return exactly one output line for each input line.
9. Keep the same numbering before |||.
10. Output ONLY: number|||converted text

Examples:
1|||आज हम एक नई app के बारे में बात करेंगे
1|||aaj hum ek nayi app ke baare mein baat karenge

2|||इससे हमारे pores close हो जाएंगे
2|||isse hamare pores close ho jayenge

3|||यह बहुत cool और refreshing feel देता है
3|||yeh bahut cool aur refreshing feel deta hai

4|||This is really good for your skin
4|||This is really good for your skin

5|||तो guys आज मैं आपको बताऊंगी
5|||toh guys aaj main aapko bataungi

Input lines:
${payload}
  `.trim();

  const response = await openai.responses.create({
    model: HINGLISH_MODEL,
    input: prompt,
  });

  const output = (response.output_text || '').trim();
  const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);

  const parsed = {};
  for (const line of lines) {
    if (!line.includes('|||')) continue;
    const [left, ...rest] = line.split('|||');
    const right = normalizeText(rest.join('|||'));
    const id = parseInt(left.trim(), 10);
    if (!Number.isNaN(id)) parsed[id] = right;
  }

  return batch.map((seg, idx) => {
    const protectedInput = protections[idx];
    const converted = parsed[idx + 1] || seg.text;
    return restoreEnglishTokens(converted, protectedInput.map);
  });
}
// ────────────────────────────────────────────────────────────────────────────

// ─── UPDATED: two-pass transcription + language-aware conversion ─────────────
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  let audioPath = null;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set in .env' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const originalName = req.file.originalname;
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    audioPath = req.file.path + (ext || '.mp3');
    fs.renameSync(req.file.path, audioPath);

    // ── Single Whisper pass: auto-detect language, transcribe exactly as spoken ──
    console.log('[transcribe] Transcribing audio...');
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(audioPath),
      prompt: `Transcribe this audio exactly as spoken. Do NOT translate. It may be Hindi, English, or Hinglish. Write Hindi words in Devanagari, keep English words in English. Prefer words like: ${GLOSSARY_HINT}`,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      temperature: 0,
    });

    const segments = (transcription.segments || [])
      .map((seg) => ({ start: seg.start, end: seg.end, text: normalizeText(seg.text) }))
      .filter((s) => s.text);

    console.log(`[transcribe] segments=${segments.length} model=${HINGLISH_MODEL}`);

    // ── Convert to Roman Hinglish (Devanagari → Roman, English → as-is) ──
    console.log('[transcribe] Converting to Roman Hinglish...');
    const batchSize = 25;
    const batches = [];
    for (let i = 0; i < segments.length; i += batchSize) {
      batches.push(segments.slice(i, i + batchSize));
    }

    const convertedSegments = [];
    for (let i = 0; i < batches.length; i++) {
      console.log(`[transcribe] batch ${i + 1}/${batches.length}`);
      const batch = batches[i];
      const convertedLines = await transliterateBatchToHinglish(batch);
      for (let j = 0; j < batch.length; j++) {
        convertedSegments.push({
          start: batch[j].start,
          end: batch[j].end,
          text: convertedLines[j],
        });
      }
    }

    // ── Step 3: Readability + timing ─────────────────────────────────────
    const merged = mergeTinySegments(
      convertedSegments.map((s) => ({
        start: Number(s.start),
        end: Number(s.end),
        text: normalizeText(s.text),
      })),
    );
    const splitForReadability = merged.map((seg) => ({
      ...seg,
      text: splitTwoLines(seg.text),
    }));
    const nonOverlapping = enforceNoOverlap(splitForReadability);
    const captions = nonOverlapping.map((seg, index) => ({
      id: index + 1,
      startTime: formatTimestamp(seg.start),
      endTime: formatTimestamp(seg.end),
      text: seg.text,
    }));

    fs.unlinkSync(audioPath);
    res.json({ captions });

  } catch (error) {
    console.error('Transcription error:', error);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    res.status(500).json({ error: error.message });
  }
});
// ────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT} (build=${SERVER_BUILD}, model=${HINGLISH_MODEL})`);
});