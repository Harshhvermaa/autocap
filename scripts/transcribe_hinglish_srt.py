import os
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


@dataclass
class Segment:
    start: float
    end: float
    text: str


GLOSSARY_HINT = (
    "Common words that may appear: ice cube, makeup, waxing, skin treatment, "
    "peel off, cool, pores, cotton, summer season, long lasting, facial, scrub, massage"
)


def format_timestamp(seconds: float) -> str:
    if seconds < 0:
        seconds = 0.0
    ms_total = int(round(seconds * 1000))
    hours = ms_total // 3600000
    ms_total %= 3600000
    minutes = ms_total // 60000
    ms_total %= 60000
    secs = ms_total // 1000
    millis = ms_total % 1000
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def normalize_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text


def parse_segments(result: Any) -> List[Segment]:
    raw_segments = getattr(result, "segments", None)
    if not raw_segments:
        raise ValueError("No segments returned from transcription.")

    segments: List[Segment] = []
    for seg in raw_segments:
        start = float(seg.start if hasattr(seg, "start") else seg["start"])
        end = float(seg.end if hasattr(seg, "end") else seg["end"])
        text = seg.text if hasattr(seg, "text") else seg["text"]
        text = normalize_text(text)
        if text:
            segments.append(Segment(start=start, end=end, text=text))
    return segments


def transcribe_with_timestamps(client: OpenAI, audio_path: str) -> List[Segment]:
    print("Step 1/3: Transcribing audio (Whisper) ...")
    with open(audio_path, "rb") as audio_file:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            # Do NOT hardcode language='hi' — let Whisper auto-detect
            # so English audio is also handled correctly
            prompt=(
                "Transcribe this audio exactly as spoken. Do NOT translate. "
                "It may be Hindi, English, or Hinglish. "
                "Write Hindi words in Devanagari where possible, keep English words in Latin letters. "
                f"Prefer words like: {GLOSSARY_HINT}"
            ),
            response_format="verbose_json",
            timestamp_granularities=["segment"],
            temperature=0,
        )
    return parse_segments(result)


def batch_segments(segments: List[Segment], batch_size: int) -> List[List[Segment]]:
    return [segments[i : i + batch_size] for i in range(0, len(segments), batch_size)]


def _parse_numbered_lines(text: str, expected: int) -> List[Optional[str]]:
    # Accept outputs that may contain extra lines; only read "N|||..."
    out: List[Optional[str]] = [None] * expected
    for line in text.splitlines():
        line = line.strip()
        if not line or "|||" not in line:
            continue
        left, right = line.split("|||", 1)
        left = left.strip()
        if not left.isdigit():
            continue
        idx = int(left)
        if 1 <= idx <= expected:
            out[idx - 1] = normalize_text(right)
    return out


def transliterate_batch_to_hinglish(
    client: OpenAI,
    batch: List[Segment],
    model: str,
    max_retries: int = 3,
) -> List[str]:
    """
    Converts each segment text to Roman Hinglish (transliteration only).
    Robust parsing + small retries for intermittent model/formatting issues.
    """
    numbered = "\n".join([f"{i}|||{seg.text}" for i, seg in enumerate(batch, start=1)])

    prompt = f"""You are a strict subtitle transliterator.

Task:
Convert each subtitle line into natural Roman Hinglish.

Rules (must follow):
1) If the input is Hindi/Devanagari: transliterate to Roman Hinglish. Do NOT translate.
2) If the input is already in English (Roman letters): PRESERVE the words exactly as-is.
   You may ONLY optionally add small Hindi filler words at natural boundaries:
   "toh", "na", "yaar", "bhai", "dekho", "matlab", "okay?" — only if they fit naturally.
   NEVER replace an English word with its Hindi equivalent.
   Wrong: "keeps" -> "rakhta hai"  |  Correct: keep "keeps"
   Wrong: "amazing" -> "kamaal"    |  Correct: keep "amazing"
3) Do NOT summarize, paraphrase, or change meaning.
4) Keep English words, brand names, and product names exactly as they are.
5) Return exactly ONE output line per input line.
6) Keep numbering exactly the same: number|||converted text
7) Output ONLY the converted lines (no headings, no explanation).

Input lines:
{numbered}
"""

    last_err: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            content = (resp.choices[0].message.content or "").strip()
            parsed = _parse_numbered_lines(content, expected=len(batch))
            # Fill missing with original text (never crash on formatting)
            return [parsed[i] or batch[i].text for i in range(len(batch))]
        except Exception as e:
            last_err = e
            if attempt >= max_retries:
                break
            sleep_s = 1.5 * (2**attempt)
            time.sleep(sleep_s)

    raise RuntimeError(f"Transliteration failed after retries: {last_err}")


def merge_tiny_segments(
    segments: List[Segment],
    min_duration: float = 0.9,
    max_combined_duration: float = 3.8,
    max_chars: int = 70,
) -> List[Segment]:
    if not segments:
        return []

    merged: List[Segment] = []
    i = 0
    while i < len(segments):
        current = Segment(**segments[i].__dict__)
        duration = current.end - current.start

        if i < len(segments) - 1:
            nxt = segments[i + 1]
            combined_duration = nxt.end - current.start
            combined_text = normalize_text(f"{current.text} {nxt.text}")

            if (
                duration < min_duration
                and combined_duration <= max_combined_duration
                and len(combined_text) <= max_chars
            ):
                current.end = nxt.end
                current.text = combined_text
                i += 1

        merged.append(current)
        i += 1

    return merged


def build_srt(segments: List[Segment]) -> str:
    blocks: List[str] = []
    for i, seg in enumerate(segments, start=1):
        start = format_timestamp(seg.start)
        end = format_timestamp(seg.end)
        text = normalize_text(seg.text)
        blocks.append(f"{i}\n{start} --> {end}\n{text}")
    return "\n\n".join(blocks) + "\n"


def main() -> None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment (.env).")

    audio_file = os.getenv("AUDIO_FILE", "audio.mp3")
    output_file = os.getenv("OUTPUT_FILE", "output_hinglish_best.srt")
    model = os.getenv("HINGLISH_MODEL", "gpt-4o-mini")
    batch_size = int(os.getenv("BATCH_SIZE", "25"))

    if not os.path.exists(audio_file):
        raise FileNotFoundError(f"{audio_file} not found.")

    client = OpenAI(api_key=api_key)

    segments = transcribe_with_timestamps(client, audio_file)
    print(f"Transcription segments: {len(segments)}")

    print("Step 2/3: Roman Hinglish transliteration ...")
    batches = batch_segments(segments, batch_size=batch_size)

    converted: List[Segment] = []
    for batch_no, batch in enumerate(batches, start=1):
        print(f"  Batch {batch_no}/{len(batches)}")
        converted_lines = transliterate_batch_to_hinglish(client, batch, model=model)
        for seg, converted_text in zip(batch, converted_lines):
            converted.append(Segment(start=seg.start, end=seg.end, text=converted_text))

    print("Step 3/3: Improving subtitle readability ...")
    final_segments = merge_tiny_segments(converted)

    srt_text = build_srt(final_segments)
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(srt_text)

    print(f"Done: {output_file}")


if __name__ == "__main__":
    main()

