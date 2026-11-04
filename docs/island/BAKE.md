# Baked physical lighting

The interactive world progressively loads `public/island/baked/architecture-baked.glb`. It contains the authored terrain, terraces, gallery, studio, stairs, timeline and contact building. Instanced vegetation and animated water remain procedural. The browser continues to use real geometry, camera movement and mesh picking.

## Delivery contract

| Asset                    |            Size | Content                                                                |
| ------------------------ | --------------: | ---------------------------------------------------------------------- |
| `architecture-baked.glb` | 4,395,132 bytes | 53 meshes, 94,884 triangles, 26 baked surfaces and ten embedded images |
| Draco WASM and wrapper   |   250,876 bytes | Decoder from the installed Three.js package                            |
| `gallery-baked.glb`      | 1,286,900 bytes | Earlier gallery-only alternative                                       |

Architecture SHA-256: `9153acbcdd80b2814c07dde6061b998b82c3a3c88e9d5a901aa1486b2518572f`.

These are the decoded asset counts before the runtime canopy refinement. The GLB uses glTF Y-up coordinates and original world placement; do not apply another world or gallery transform. Bounds are approximately x[-8.87993, 9.36454], y[-0.83483, 9.08800], z[-4.57792, 6.40365]. It retains 13 Work, 14 About, seven Experience and eight Contact meshes. Eleven terrain/circulation meshes have no destination and remain picking occluders.

`world.ts` keeps its procedural architecture until `loadBakedArchitecture(resources, invalidate)` returns a group. It then calls `refineGalleryCanopy`, adds the replacement directly to the world, and rebuilds picking. The temporary architecture has a separate resource scope, released after the replacement's first rendered frame. A failed load leaves the procedural scene usable. `loadBakedGallery` remains available for the earlier smaller alternative.

`canopy.ts` opens the loaded gallery's broad right pier while preserving interpolated lightmap UVs, then adds an underside and a thin structural post. It relies on the authored asset bounds; verify this refinement after changing the source gallery. Current browser captures include this refinement, while an earlier standalone Cycles study may not.

## Loading and disposal

The loader aborts the GLB fetch and decoder-library requests, terminates Draco workers, and owns individual parser results as they resolve. Geometry, materials, textures and decoded ImageBitmaps are tracked even if parsing finishes after cancellation. All ten images are embedded: one JPEG lighting atlas, eight exact source PNGs and one coastal WebP through `EXT_texture_webp`. There are no external GLB image URIs.

The renderer classifies late-loaded materials on every frame. Transparent signs and glass must not become opaque quads in the contact-occlusion pass. Picking includes the literal-color layers as well as physical surfaces.

## Color and reflections

The 4096 × 4096 atlas stores **8-bit LDR sRGB appearance**: direct diffuse light, indirect diffuse light and albedo, baked at 64 samples. Its values are encoded and clipped to the image range without an additional AgX display curve. It does not retain HDR radiance.

- Flat atlas surfaces use `MeshBasicMaterial` with `toneMapped=false`.
- Four glossy surfaces use a black-base `MeshPhysicalMaterial`, the same atlas as emissive diffuse, original roughness/clearcoat values and `toneMapped=false`. The black base avoids adding diffuse light twice. Reflection highlights can clip in the LDR representation.
- Blue and citrus accents retain their original runtime PBR materials. Chrome, other metals, lights, glazing, screens and signage remain separate materials.
- Coastal cliffs and perimeter boulders use their original PBR material and UV0. The cliff retains its existing vertex colors; the boulder batch has none. Both use color `e4d8c7`, roughness 1, metalness 0 and bump scale 0.16.

The baked atlas uses `TEXCOORD_1`; `bakedSurface` metadata records original roughness, metalness and clearcoat settings. The renderer uses layers 0/1 for tone-mapped opaque/transparent materials and 2/3 for literal opaque/transparent materials. Literal color is composited after tone mapping, with depth retained. Native antialiasing requires an opaque geometry depth prepass to avoid rejecting half the samples on angled screens; non-antialiased contexts use a depth copy. Glass and transparent text share the final depth-sorted pass.

High quality captures a one-time 128-pixel cube environment from the modeled world for polished floors, glass and metal. This local probe adds view-dependent reflections; it is not continuous global illumination. See [ARCHITECTURE.md](ARCHITECTURE.md) for rendering and resource ownership.

## Provenance

Models and materials originate in this repository's scene modules. The exporter calls `createWorld(..., false)` to disable older baked replacements, separates architecture from vegetation, waits for mineral maps and the three project screens, and records source-file hashes and camera framing.

The real project displays remain Maison Sol, Erden Vaux and Veyli Colour. Their composed scene PNGs are restored byte-for-byte from the authoring GLB; original screenshots and canonical links are unchanged. The two mineral textures are recorded in [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).

Authoring used [Blender 4.5.15 LTS](https://download.blender.org/release/Blender4.5/), the official Apple Silicon binary downloaded into `/private/tmp/portfolio-blender-proof` and mounted read-only. No global installation or saved configuration change was made. The verified binary SHA-256 is `bfbc0bda099d1ab7aef0992a584f872f58bed9bb491210ad45f9ca071aa2e688`.

Cycles used the available Metal GPU with a Nishita sky, warm sun and reflected fill. The standalone study uses AgX, Medium High Contrast and exposure +0.35, so its display curve differs from the delivery atlas. Only browser captures establish the shipped appearance.

The Draco decoder was copied unchanged from `three/examples/jsm/libs/draco/gltf`. Its [Apache 2.0 license](../../public/island/baked/draco/LICENSE) is included with the files. No production npm dependency was added. `architecture-baked.json` records asset/source hashes, camera, material preservation and decoder hashes; temporary source GLBs and Blender working files are not delivery assets.

## Regeneration

The exporter uses the existing Vite, Playwright and Three.js packages. It starts localhost port 4199 with a private temporary dependency cache.

```sh
node scripts/export-scene.mjs /private/tmp/portfolio-blender-proof/final-architecture-source.glb
/path/to/Blender --background --factory-startup --python scripts/bake-scene.py -- \
  /private/tmp/portfolio-blender-proof/final-architecture-source.glb \
  /private/tmp/portfolio-blender-proof/final-architecture --architecture
```

The output directory receives the GLB, atlas, Blender file, study image and `physical-lighting-proof.json` report. Use `--no-render` to skip the study image or `--gallery` for the earlier 2K gallery bake. The validated architecture uses 64 samples, JPEG atlas quality 85 and Draco quantization of 16-bit positions, 12-bit normals and 14-bit UVs. `BAKE_DIFFUSE_SAMPLES` and `BAKE_JPEG_QUALITY` control authoring quality.

After inspecting a regenerated result, promote the GLB to `public/island/baked/`, refresh its manifest and browser validation evidence, and regenerate the actual-scene posters. Do not rewrite source hashes to conceal a mismatch. Recheck the runtime canopy refinement and color pipeline after changing geometry, materials, screens or lighting.

The browser water shader is excluded from the GLB; the study reconstructs its footprint with a physical water material. Vegetation is expanded only in the temporary authoring file to cast shadows and is excluded from the delivered architecture.

## Material preservation

Forcing every image to JPEG removed transparency from five signs. The preservation step now restores all eight literal PNGs and their unlit material settings exactly, keeps blue/yellow accents as PBR, and restores the coastal boulder and cliff batches. It can repair an existing asset without another lighting bake:

```sh
python3 scripts/bake-scene.py --repair-only source-world.glb architecture-baked.glb
```

Source mesh 3/material 3 identifies the perimeter-boulder batch by its bounds and lack of `COLOR_0`. Source mesh 0/material 0 identifies the taller cliff batch and retains its 15,948 decoded color vertices. Restoring these materials removes baked occlusion left by overlapping planting rocks that were subsequently removed. Terrace and slab materials retain their atlas lighting.

The original 471,546-byte coastal WebP is embedded unchanged. It matches a vertical flip of the source GLB mineral PNG, so `KHR_texture_transform` offset [0, 1] and scale [1, -1] preserve UV0 appearance. The repair is idempotent and leaves every Draco geometry payload and destination tag unchanged.

## Verification limits

`architecture-validation.json` records an isolated loader check: 53 meshes, expected routes and material classes, 85 retained allocations disposed, both cancellation cases passing, both created workers terminated, all 20 ImageBitmaps closed and no page errors. Its approximately 0.2-second cached load/decode result is not cold-network loading or browser GPU FPS evidence.

The focused color probe verifies literal pixels, occlusion and transparent ordering across high/low quality and antialiasing modes. Integrated navigation/lifecycle checks and reference comparison remain separate release gates. Consult the latest test output and `design-qa.md`; neither this asset guide nor a successful bake claims final visual acceptance.
