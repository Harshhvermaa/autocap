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
  const detected = ratio > 0.3 ? 'hi' : 'en';
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

// ─── UPDATED: accepts sourceLang param ──────────────────────────────────────
async function transliterateBatchToHinglish(batch, sourceLang = 'hi') {
  // protectEnglishTokens is only useful for Hindi audio (to preserve English words
  // embedded in Devanagari text). For English audio, applying it locks ALL words
  // into placeholders and leaves GPT nothing to Hinglishify — so skip it.
  const useProtection = sourceLang === 'hi';
  const protections = batch.map((seg) =>
    useProtection ? protectEnglishTokens(seg.text) : { text: seg.text, map: new Map() },
  );
  const payload = protections.map((p, idx) => `${idx + 1}|||${p.text}`).join('\n');

  let prompt;

  if (sourceLang === 'hi') {
    // Hindi/Devanagari → Roman Hinglish (strict transliteration, no paraphrase)
    prompt = `
You are a strict subtitle transliterator.

Task:
Convert each line into natural Roman Hinglish.

Very important rules:
1. Transliterate only. Do NOT summarize.
2. Do NOT paraphrase.
3. Do NOT improve grammar.
4. Do NOT change meaning.
5. Keep English words exactly as they are (and keep placeholders like [[EN0]] unchanged).
6. Convert Hindi/Urdu words into simple Roman script.
7. Preserve brand/product/style words if they are already in English.
8. Return exactly one output line for each input line.
9. Keep the same numbering before |||.
10. Output only plain text lines in the same format: number|||converted text

Examples:
1|||आज हम एक नई app के बारे में बात करेंगे
1|||aaj hum ek nayi app ke baare mein baat karenge

2|||इससे हमारे pores close हो जाएंगे
2|||isse hamare pores close ho jayenge

3|||यह बहुत cool और refreshing feel देता है
3|||yeh bahut cool aur refreshing feel deta hai

Input lines:
${payload}
    `.trim();
  } else {
    // English → casual Hinglish-flavored Roman (for English audio)
    prompt = `
You are a subtitle style converter for English content targeted at Hindi-speaking audiences.

Task:
Convert each English subtitle line into a casual, Hinglish-flavored Roman style.
The output should feel like how a bilingual Hindi-English speaker would naturally say it.

Rules:
1. Keep the core meaning exactly the same. Do NOT paraphrase or summarize.
2. You may naturally add small Hindi filler words where they fit:
   "toh", "yaar", "na", "hai", "matlab", "dekho", "iska", "aur" etc.
   But don't force it — if the English line already sounds natural and casual, keep it mostly as-is.
3. Do NOT translate entire sentences to Hindi — output must be Roman script only.
4. Keep placeholders like [[EN0]] unchanged.
5. Keep brand names, product names, and technical terms unchanged.
6. Return exactly one output line per input line, same numbering before |||.
7. Output only: number|||converted text

Examples:
1|||This product keeps your skin cool all day long.
1|||yeh product aapki skin ko poore din cool rakhta hai.

2|||Today I'm going to show you something amazing.
2|||toh aaj main aapko kuch amazing dikhane wala hoon.

3|||Make sure to apply it evenly on your face.
3|||isse apne face pe evenly apply karo, okay?

4|||It works great for oily skin too.
4|||oily skin ke liye bhi yeh kaafi achha kaam karta hai.

Input lines:
${payload}
    `.trim();
  }

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

    // ── PASS 1: Auto-detect transcription (NO language hint — let Whisper decide) ──
    console.log('[transcribe] Pass 1: auto-detect transcription...');
    const pass1 = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(audioPath),
      // ⚠️  Do NOT set `language` here — Whisper must detect it freely.
      // Setting language:'hi' here was causing English audio to be mis-transcribed.
      prompt: `Transcribe this audio exactly as spoken. Do NOT translate. It may be Hindi, English, or Hinglish. Write Hindi words in Devanagari (हिन्दी) where possible, keep English words in Latin letters. Prefer words like: ${GLOSSARY_HINT}`,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      temperature: 0,
    });

    let segments = (pass1.segments || [])
      .map((seg) => ({ start: seg.start, end: seg.end, text: normalizeText(seg.text) }))
      .filter((s) => s.text);

    // ── Language detection ────────────────────────────────────────────────
    const detectedLang = detectLanguage(segments);

    // ── PASS 2: Re-transcribe with correct language hint if English ───────
    if (detectedLang === 'en') {
      console.log('[transcribe] Pass 2: re-transcribing with language=en for better accuracy...');
      const pass2 = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(audioPath),
        language: 'en',
        prompt: `This is English audio. Transcribe accurately. Keep brand names as spoken. Prefer words like: ${GLOSSARY_HINT}`,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
        temperature: 0,
      });

      segments = (pass2.segments || [])
        .map((seg) => ({ start: seg.start, end: seg.end, text: normalizeText(seg.text) }))
        .filter((s) => s.text);
    }

    const devanagariCount = segments.reduce((acc, s) => acc + (hasDevanagari(s.text) ? 1 : 0), 0);
    const mostlyEnglishCount = segments.reduce((acc, s) => acc + (looksMostlyEnglish(s.text) ? 1 : 0), 0);
    console.log(
      `[transcribe] build=${SERVER_BUILD} lang=${detectedLang} segments=${segments.length} devanagari=${devanagariCount} mostlyEnglish=${mostlyEnglishCount} model=${HINGLISH_MODEL}`,
    );

    // ── Step 2: Convert to Roman Hinglish (language-aware) ───────────────
    console.log(`[transcribe] Converting to Roman Hinglish (sourceLang=${detectedLang})...`);
    const batchSize = 25;
    const batches = [];
    for (let i = 0; i < segments.length; i += batchSize) {
      batches.push(segments.slice(i, i + batchSize));
    }

    const convertedSegments = [];
    for (let i = 0; i < batches.length; i++) {
      console.log(`[transcribe] batch ${i + 1}/${batches.length}`);
      const batch = batches[i];
      // Pass detectedLang so correct prompt is used
      const convertedLines = await transliterateBatchToHinglish(batch, detectedLang);
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