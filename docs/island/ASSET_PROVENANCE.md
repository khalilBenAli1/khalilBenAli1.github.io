# Island asset provenance

These delivery assets use existing local project screenshots and licensed local font packages. No generated or invented client screenshots are used. Original `public/projects/` files are not modified. The island world and its fallback posters are authored in the application scene, outside this asset lane.

## Screen derivatives

Sources are the current existing application captures in `public/projects/`. Derivatives use Pillow 12.3.0: RGB, Lanczos resize to 1024 px width, rounded proportional height, WebP quality 92, method 6. They are opaque, uncropped, and retain the source composition. Integer pixel rounding is the only aspect ratio approximation.

| Source | Original size | Original bytes | Original SHA-256 |
| --- | --- | ---: | --- |
| `public/projects/maison-sol.jpg` | 1440 × 1000 | 184727 | `a05dd3ebd6c9105ba16219395e141ed9369cf87bf5a43da7679e3551337b31c8` |
| `public/projects/veyli-colour.jpg` | 1200 × 833 | 135388 | `fb09e9782d87f24ee71e56ef2ae63023a1bbec3120f672aeb80f49766b239e7a` |
| `public/projects/erdenvaux.jpg` | 1200 × 833 | 64806 | `99d93dbc56ef45b87b6f15d3fc5b813c2760c69260f6f96f1da33272ffbff8b6` |

| Delivery | Size | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `public/island/screens/maison-sol.webp` | 1024 × 711 | 104338 | `e67aa19f76c2a94774cf5d194837e2371dd7a26ec42cd19a3df6a8d48568908b` |
| `public/island/screens/veyli-colour.webp` | 1024 × 711 | 80618 | `15308fcf63ef8bb4aa820ea2c6eec4782b2b4331af6151232b0481ce8a4a50e3` |
| `public/island/screens/erdenvaux.webp` | 1024 × 711 | 41394 | `0330ed8a0ab1ece0fad49dfd5078f003432dbde682c78072832b3122dd7a2bbc` |

## Self-hosted fonts

The exact Latin, normal-style WOFF2 files were copied unchanged from the already installed packages below. Only delivery filenames change. Both source packages are version 5.3.0 and declare `OFL-1.1`. No downloads, dependency additions, or external font requests are required.

- Syne source: `../veyli-colour-nuxt/node_modules/@fontsource/syne`.
- DM Sans source: `../maison-sol-react/node_modules/@fontsource/dm-sans`.
- CSS family names: `Syne` and `DM Sans`. Use the weights in the ledger and `font-display: swap`.

| Family | Weight | Source file (within package) | Delivery | Bytes | SHA-256 |
| --- | ---: | --- | --- | ---: | --- |
| Syne | 700 | `files/syne-latin-700-normal.woff2` | `public/fonts/island/syne-700.woff2` | 14072 | `0aad69416fc0ccf6f340647c46e759d5c6e4628d92576b279ec5ada0afbd9d35` |
| Syne | 800 | `files/syne-latin-800-normal.woff2` | `public/fonts/island/syne-800.woff2` | 13684 | `1a340e84b78c7e1e7ed24306d682fdcd6dc8cc6cb52b158fbaf22c03f7f001c3` |
| DM Sans | 400 | `files/dm-sans-latin-400-normal.woff2` | `public/fonts/island/dm-sans-400.woff2` | 14200 | `4ab51eb2cd7305d177187908d6397474d4520663f6c6e572feb0a64f4fa80006` |
| DM Sans | 500 | `files/dm-sans-latin-500-normal.woff2` | `public/fonts/island/dm-sans-500.woff2` | 14304 | `19bf1984956517c35c2bd35b6cdedac12a21d6fcd3596c614ecdfb88b648909d` |
| DM Sans | 600 | `files/dm-sans-latin-600-normal.woff2` | `public/fonts/island/dm-sans-600.woff2` | 14144 | `6bb2b2645ba5eeaecf56322c543fa3a75b87b927977b9c03b1dabc4205089120` |

Font delivery total: **70,404 bytes** (five WOFF2 files).

## License and author notices

The complete source licenses, including all copyright notices, are copied verbatim:

- `public/fonts/island/syne-OFL.txt` — Copyright 2019 The Syne Project Authors (https://gitlab.com/bonjour-monde/fonderie/syne-typeface).
- `public/fonts/island/dm-sans-OFL.txt` — Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts). The source notice also identifies the italic TTF; it is retained verbatim although only normal WOFF2 files are delivered.

| License delivery | Bytes | SHA-256 |
| --- | ---: | --- |
| `public/fonts/island/syne-OFL.txt` | 4400 | `ea775d83f01ecd45fc622fa5db568fad99c9338192594c3719a52b78bab91e44` |
| `public/fonts/island/dm-sans-OFL.txt` | 4502 | `6fbd040a29c2037a765dfb9f2561e9965b5c95c6dcb5dce516089d63d5f17af7` |

## Verification

- Every source file in `public/projects/` was hashed before and after generation and remained byte-identical.
- Every WebP reopens successfully with the expected 1024 × 711 dimensions, RGB mode, and no alpha channel.
- Each WOFF2 has a valid `wOF2` signature and a SHA-256 identical to its source package file.
- Both copied license files are byte-identical to the package license originals.
- No original image, PDF, portrait, existing font, dependency manifest, or application style is edited by this lane.
