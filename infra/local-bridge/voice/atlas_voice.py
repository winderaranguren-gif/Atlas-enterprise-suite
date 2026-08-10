from __future__ import annotations

from pathlib import Path
import os
import sys

import torch
import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

VOICE_HOME = Path(os.getenv("ATLAS_VOICE_HOME", Path.home() / "ATLAS_PRIVATE" / "voice"))
REFERENCE_DIR = VOICE_HOME / "references"
OUTPUT_DIR = VOICE_HOME / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

EN_REFERENCE = REFERENCE_DIR / "winder_en_ref.wav"
ES_REFERENCE = REFERENCE_DIR / "winder_es_ref.wav"


def select_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def normalize_english(text: str) -> str:
    replacements = {
        "ERP": "E R P",
        "KPI": "K P I",
        "KPIs": "K P I's",
        "PTO": "P T O",
        "W-2": "W two",
        "1099": "ten ninety-nine",
        "AP": "A P",
        "AR": "A R",
    }
    for source, spoken in replacements.items():
        text = text.replace(source, spoken)
    return text


def generate(model: ChatterboxMultilingualTTS, *, text: str, language: str, output: Path) -> Path:
    reference = EN_REFERENCE if language == "en" else ES_REFERENCE
    if not reference.exists():
        raise FileNotFoundError(f"Missing voice reference: {reference}")

    if language == "en":
        text = normalize_english(text)

    wav = model.generate(
        text,
        language_id=language,
        audio_prompt_path=str(reference),
        exaggeration=0.5,
        cfg_weight=0.5,
    )
    ta.save(str(output), wav, model.sr)
    return output


def main() -> int:
    if len(sys.argv) < 4:
        print("Usage: python atlas_voice.py <en|es> <output_filename.wav> <text>")
        return 2

    language = sys.argv[1].lower()
    if language not in {"en", "es"}:
        raise ValueError("language must be 'en' or 'es'")

    output = OUTPUT_DIR / sys.argv[2]
    text = " ".join(sys.argv[3:]).strip()
    if not text:
        raise ValueError("text cannot be empty")

    device = select_device()
    print(f"ATLAS Voice device: {device}")
    model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model="v3")
    generated = generate(model, text=text, language=language, output=output)
    print(f"Saved: {generated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
