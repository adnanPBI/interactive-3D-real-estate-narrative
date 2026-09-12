# Convalt Stage 6 R6 — Hero Fidelity Implementation

R6 is an asset-first visual-fidelity release. It does not attempt to rescue the R5 procedural scenes with renderer settings alone.

## What changed

- Six independent visual-development hero blueprints live in `assets-source/r6/authoring/`.
- Every hero exports `lod0.glb`, `lod1.glb`, `lod2.glb`, and `proxy.glb`.
- LOD0 combines the richest retained R5 context with a bespoke R6 focal cluster; LOD1 uses a reduced hero; LOD2/proxy use progressively lighter context.
- Hard-surface hero masses use true chamfer geometry (`bevel_mesh()` / `bevel_box()`), so primary edges participate in silhouettes and specular highlights.
- Repeated solar arrays, trees and turbines use `THREE.InstancedMesh` runtime paths.
- Hero textures are converted to KTX2 Basis: UASTC for LOD0/LOD1, ETC1S for LOD2/proxy where textures exist.
- R6 adds an `EffectComposer` output path with `SMAAPass`, while native canvas antialiasing remains enabled.
- Ordinary architecture is never blended through a generic transparent pass. Scene transitions use `alphaHash` for opaque materials; only authored glass/contact-shadow materials remain transparent.
- `ChapterScene` permits LOD0 only when `sceneIndex === activeChapter`; the transition neighbour renders at LOD1 or lighter.
- Camera/model transforms reserve a strict copy lane, with left-copy chapters pushed right and right-copy chapters pushed left.
- Low-power/reduced-motion mode uses six rendered WebP R6 stills rather than the old Stage 3 fallback illustrations.
- WebGL context loss or React/WebGL tree errors fail closed to the authored fallback path.

## Enforced runtime budgets

| Gate | High | Medium |
|---|---:|---:|
| Active triangles | <= 220,000 | <= 120,000 |
| Draw calls | <= 120 | <= 80 |
| Texture memory policy | <= 180 MB | <= 100 MB |
| LOD0 heroes | <= 1 | 0 |
| Initial DPR | 1.25 | 1.00 |
| DPR cap | 1.35 | 1.00 |
| Shadow map | 2048 | 1024 |
| SMAA | required | required |

`validate-r6-budgets.mjs` evaluates a conservative current-hero + neighbour + shared-scene worst case. `PerformanceGovernor` records live calls/triangles/textures and downgrades LOD before lowering DPR; SMAA is disabled only as an emergency recovery path below the acceptance operating envelope.

## Asset pipeline

1. `npm run assets:r6:raw` generates all 24 GLBs and manifest data from the six authoring modules.
2. `npm run assets:r6:fallbacks` renders the six low-power WebP frames from LOD0 using the pinned VTK authoring dependency.
3. CI installs temporary authoring-only `@gltf-transform/*`, `ktx2-encoder`, and `sharp` packages without changing the application lockfile.
4. `npm run assets:r6:textures` converts embedded textures to KTX2 and refreshes hashes/encoding metadata.
5. R6 corporate/material/budget validators run.
6. TypeScript, focused R6 tests, and the production build must pass before Vercel deploy.

## Key runtime files

- `components/experience/R6PostFX.tsx` — SMAA / multisampled output.
- `components/experience/ChapterScene.tsx` — one-LOD0 policy and quality-aware LOD selection.
- `components/experience/SceneAsset.tsx` — PBR tuning, opaque alpha-hash transitions, shadow policy.
- `components/experience/R6InstancedDetails.tsx` — repeated equipment/landscape instancing.
- `components/experience/PerformanceGovernor.tsx` — live performance evidence and staged degradation.
- `components/experience/LaptopBenchmarkPanel.tsx` — physical-device acceptance evidence.
- `experience/config/scenes.ts` — R6 camera, model and copy-safe art direction.

## Provenance

R6 hero meshes are bespoke code-authored visual-development assets. They are not client CAD, BIM, photogrammetry, or as-built engineering models and must not be represented as such.
