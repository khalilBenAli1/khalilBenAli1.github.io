# Island asset provenance

The scene uses actual captures of the completed portfolio applications, licensed self-hosted fonts, original geometry and generated mineral textures. Fictional brands and private professional work retain their existing labels in the content. Original `public/projects/` images, the portrait and PDF downloads are not replaced by generated assets.

## Screen derivatives

Sources are the current existing application captures in `public/projects/`. Derivatives use Pillow 12.3.0: RGB, Lanczos resize to 1024 px width, rounded proportional height, WebP quality 92, method 6. They are opaque, uncropped, and retain the source composition. Integer pixel rounding is the only aspect ratio approximation.

| Source                             | Original size | Original bytes | Original SHA-256                                                   |
| ---------------------------------- | ------------- | -------------: | ------------------------------------------------------------------ |
| `public/projects/maison-sol.jpg`   | 1440 × 1000   |         184727 | `a05dd3ebd6c9105ba16219395e141ed9369cf87bf5a43da7679e3551337b31c8` |
| `public/projects/veyli-colour.jpg` | 1200 × 833    |         135388 | `fb09e9782d87f24ee71e56ef2ae63023a1bbec3120f672aeb80f49766b239e7a` |
| `public/projects/erdenvaux.jpg`    | 1200 × 833    |          64806 | `99d93dbc56ef45b87b6f15d3fc5b813c2760c69260f6f96f1da33272ffbff8b6` |

| Delivery                                  | Size       |  Bytes | SHA-256                                                            |
| ----------------------------------------- | ---------- | -----: | ------------------------------------------------------------------ |
| `public/island/screens/maison-sol.webp`   | 1024 × 711 | 104338 | `e67aa19f76c2a94774cf5d194837e2371dd7a26ec42cd19a3df6a8d48568908b` |
| `public/island/screens/veyli-colour.webp` | 1024 × 711 |  80618 | `15308fcf63ef8bb4aa820ea2c6eec4782b2b4331af6151232b0481ce8a4a50e3` |
| `public/island/screens/erdenvaux.webp`    | 1024 × 711 |  41394 | `0330ed8a0ab1ece0fad49dfd5078f003432dbde682c78072832b3122dd7a2bbc` |

## Self-hosted fonts

The exact Latin, normal-style WOFF2 files were copied unchanged from the already installed packages below. Only delivery filenames change. The Syne and DM Sans source packages are version 5.3.0 and declare `OFL-1.1`. No downloads, dependency additions, or external font requests are required.

- Syne source: `../veyli-colour-nuxt/node_modules/@fontsource/syne`.
- DM Sans source: `../maison-sol-react/node_modules/@fontsource/dm-sans`.
- DM Sans supplies the current companion typography. The earlier Syne files remain available; the current display face is Inter, recorded below. Fonts use `font-display: swap`.

| Family  | Weight | Source file (within package)           | Delivery                                | Bytes | SHA-256                                                            |
| ------- | -----: | -------------------------------------- | --------------------------------------- | ----: | ------------------------------------------------------------------ |
| Syne    |    700 | `files/syne-latin-700-normal.woff2`    | `public/fonts/island/syne-700.woff2`    | 14072 | `0aad69416fc0ccf6f340647c46e759d5c6e4628d92576b279ec5ada0afbd9d35` |
| Syne    |    800 | `files/syne-latin-800-normal.woff2`    | `public/fonts/island/syne-800.woff2`    | 13684 | `1a340e84b78c7e1e7ed24306d682fdcd6dc8cc6cb52b158fbaf22c03f7f001c3` |
| DM Sans |    400 | `files/dm-sans-latin-400-normal.woff2` | `public/fonts/island/dm-sans-400.woff2` | 14200 | `4ab51eb2cd7305d177187908d6397474d4520663f6c6e572feb0a64f4fa80006` |
| DM Sans |    500 | `files/dm-sans-latin-500-normal.woff2` | `public/fonts/island/dm-sans-500.woff2` | 14304 | `19bf1984956517c35c2bd35b6cdedac12a21d6fcd3596c614ecdfb88b648909d` |
| DM Sans |    600 | `files/dm-sans-latin-600-normal.woff2` | `public/fonts/island/dm-sans-600.woff2` | 14144 | `6bb2b2645ba5eeaecf56322c543fa3a75b87b927977b9c03b1dabc4205089120` |

This earlier Syne/DM Sans subset totals **70,404 bytes**. With the Inter file below, `public/fonts/island/` contains six WOFF2 files totaling **118,660 bytes**.

## License and author notices

The complete source licenses, including all copyright notices, are copied verbatim:

- `public/fonts/island/syne-OFL.txt` — Copyright 2019 The Syne Project Authors (https://gitlab.com/bonjour-monde/fonderie/syne-typeface).
- `public/fonts/island/dm-sans-OFL.txt` — Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts). The source notice also identifies the italic TTF; it is retained verbatim although only normal WOFF2 files are delivered.

| License delivery                      | Bytes | SHA-256                                                            |
| ------------------------------------- | ----: | ------------------------------------------------------------------ |
| `public/fonts/island/syne-OFL.txt`    |  4400 | `ea775d83f01ecd45fc622fa5db568fad99c9338192594c3719a52b78bab91e44` |
| `public/fonts/island/dm-sans-OFL.txt` |  4502 | `6fbd040a29c2037a765dfb9f2561e9965b5c95c6dcb5dce516089d63d5f17af7` |

## Source-asset verification

- Every source file in `public/projects/` was hashed before and after generation and remained byte-identical.
- The three screen derivatives reopen at 1024 × 711 in RGB mode without alpha.
- Each WOFF2 has a valid `wOF2` signature and a SHA-256 identical to its source package file.
- Both copied license files are byte-identical to the package license originals.
- Original image, portrait and PDF bytes remain protected by the immutable preservation tests. The implementation adds delivery assets without changing the production dependency manifest.

## Reference-matching display typography

The hero uses Inter’s real variable weight 900, served as `Island Display`. The font and license are copied unchanged from the existing `@fontsource-variable/inter` package (version 5.3.0); no dependency was added. The public asset URL keeps font delivery within the checkout when `node_modules` is shared through a worktree symlink. Module-resolved font URLs must not silently fall back because the resolved file lies outside the development server root.

| Delivery                                   |  Bytes | SHA-256                                                            |
| ------------------------------------------ | -----: | ------------------------------------------------------------------ |
| `public/fonts/island/inter-variable.woff2` | 48,256 | `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` |
| `public/fonts/island/inter-OFL.txt`        |  4,477 | `3b0a5fca3d17942cde889069889dedbbbd075e9b599968c82a95f4d944e9b345` |

Source: `node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2`. License: SIL Open Font License 1.1, copied verbatim from the package `LICENSE` to `public/fonts/island/inter-OFL.txt`.

## Original geometry and mineral textures

The architecture, terrain, furniture, curved timeline, KB sculpture, plants and water are authored in `src/scripts/island/scene/`. No third-party model is used. The reference remains a visual specification and is not shipped as the hero. `canopy.ts` further opens the loaded gallery's right pier at runtime while preserving its atlas coordinates.

Both mineral images were generated with the built-in ImageGen tool on 2026-11-03, resized to 1024 × 1024, and encoded with Pillow as WebP using method 6. They are surface maps on real geometry, not rendered island images.

| Delivery                                         | Encoding        |   Bytes | SHA-256                                                            |
| ------------------------------------------------ | --------------- | ------: | ------------------------------------------------------------------ |
| `public/island/materials/travertine.webp`        | WebP quality 90 | 382,608 | `beeb19ea2661d94577b35288075ade20e245155cc6d6e6a06e7f7d99e8a3fd56` |
| `public/island/materials/coastal-limestone.webp` | WebP quality 89 | 471,546 | `a2fa42d71e530934c15dbef9c78c53ece6747357616024b4eb8636b7e27f22ae` |

Travertine source output: `exec-7ea3cf9b-afc3-4c8d-88a7-14dfb8685175.png`.

Prompt: “Use case: photorealistic-natural. Asset type: tileable PBR base-color material texture for a realtime 3D Mediterranean architectural portfolio. Generate a square perfectly flat orthographic close-up of warm pale ivory beige Italian travertine limestone, finely porous mineral grain, subtle natural mottled tan and cream variation, tiny pits and mineral flecks, occasional subtle wispy veins, sophisticated expensive honed architectural stone. Entire image one continuous stone surface. Uniform flat diffuse lighting; absolutely no cast shadow, no perspective, no vignette, no border, no tile grout, no objects, no text. Seamless repeatable edges. Photorealistic macro material scan quality. Visible medium-scale variegation with fine pores, restrained warm cream colors, never yellow or orange, no repetitive stripes. This is a texture map ONLY, not a rendered object or scene.”

Coastal limestone source output: `exec-4b41ca5c-7c08-465f-8f8c-b0349b110eb5.png`.

Prompt: “Asset type: seamless square PBR albedo texture for an original interactive 3D Mediterranean limestone island cliff. A perfectly flat orthographic material scan of naturally weathered pale beige Mediterranean coastal limestone. Rich irregular mineral mottling, warm ivory exposed fractures, taupe-gray weathering in crevices, subtle golden beige patches, porous fossil grain and hairline cracks. Natural rugged geological stone, NOT a built stone wall, NOT loose pebbles, no blocks, no mortar. No lighting shadows baked into image; uniformly lit flat color map with high-frequency pore detail and medium-scale mineral variation. Tiled seamless edges, square texture fills whole frame. No perspective, no objects, no border, no text. Realistic geology, varied enough to distinguish from polished travertine architecture, still warm and light in palette. This is only a surface texture for real 3D rocky geometry, not an island illustration.”

## Portrait, baked model and fallback images

`public/khalil.jpg` remains the original 640 × 640, 27,910-byte portrait, SHA-256 `a529de1e483de5450b9eea611ae7ce0df8a9b30cb223d37095bef2eb61b3fe66`. About uses CSS `object-fit: cover` inside a proportional frame; the source pixels and identity are unchanged.

The baked architecture is derived from these original scene models and maps using Blender Cycles. All ten GLB images are embedded: one lighting atlas, eight exact source PNGs (three project screens and five transparent signs), and the coastal WebP through `EXT_texture_webp`. The blue/yellow accents and the restored coastal cliff/boulder materials retain runtime PBR shading. See [BAKE.md](BAKE.md) for hashes, decoder licensing, repairs and regeneration.

The Home fallback and all eight room fallbacks come from the live WebGL framebuffer of the production build. The final captures used Chromium on an Apple M1 with ANGLE Metal. Home hashes, dimensions and renderer details are in [SCENE_POSTERS.json](SCENE_POSTERS.json). Room hashes and camera selections are in [spatial-capture.json](qa/spatial-capture.json). Regenerate these WebPs after changing the scene or camera.
