# Local fonts

## Manrope

Unmodified variable font from the [Google Fonts Manrope distribution](https://github.com/google/fonts/tree/main/ofl/manrope), downloaded 2026-10-05. Copyright 2018 The Manrope Project Authors.

Licensed under the SIL Open Font License 1.1; see [OFL.txt](OFL.txt). `Manrope-Variable.woff2` is a lossless WOFF2 conversion of the original TTF, with its full character coverage and variable weights. Served locally through `next/font/local`, with no external font requests.

## Fraunces

`Fraunces-500-Optical.woff2` supplies the editorial headings and collection titles.
It is derived from `Fraunces-Variable.ttf`, fixing the app's heading weight at 500,
SOFT at 0 and WONK at 1, while retaining variable optical sizing (9–144) and all
characters, including Finnish glyphs. It is hosted through `next/font/local`.
Manrope remains the font for body text, navigation and controls.

Source: https://github.com/google/fonts/tree/main/ofl/fraunces
Upstream: https://github.com/undercasetype/Fraunces
License: `Fraunces-OFL.txt` (SIL Open Font License 1.1).

## Rebuilding the optimized assets

The original TTF files and both licenses are retained for reproducibility.
The WOFF2 files are committed; Python is not needed to build or deploy the app.
To regenerate them using the same converter:

```sh
python3 -m venv /tmp/wishlist-fonts
/tmp/wishlist-fonts/bin/pip install 'fonttools[woff]==4.60.2'
/tmp/wishlist-fonts/bin/python scripts/prepare-fonts.py
```

The converter preserves timestamps for deterministic output and checks character
coverage. Keep `font-display: swap` and review visual changes if heading weights,
font axes, or source fonts change. Adding a heading weight other than 500 requires
a corresponding Fraunces font asset.
