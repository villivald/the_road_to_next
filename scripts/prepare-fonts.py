"""Rebuild the local WOFF2 assets using fonttools[woff]==4.60.2."""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


directory = Path(__file__).resolve().parents[1] / "src" / "assets" / "fonts"

for source, target in [
    ("Manrope-Variable.ttf", "Manrope-Variable.woff2"),
    ("Fraunces-Variable.ttf", "Fraunces-500-Optical.woff2"),
]:
    original = TTFont(directory / source, recalcTimestamp=False)
    font = TTFont(directory / source, recalcTimestamp=False)
    if source.startswith("Fraunces"):
        font = instantiateVariableFont(
            font, {"wght": 500, "SOFT": 0, "WONK": 1}, inplace=True
        )
    font.recalcTimestamp = False
    font.flavor = "woff2"
    font.save(directory / target)
    generated = TTFont(directory / target)
    if original.getBestCmap() != generated.getBestCmap():
        raise RuntimeError(f"Character coverage changed in {target}")
    print(f"{target}: {(directory / target).stat().st_size} bytes")
