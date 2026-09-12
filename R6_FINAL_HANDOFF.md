# Convalt Energy — R6 Hero Fidelity Handoff

## Release objective

R6 replaces the R5 "more procedural geometry + renderer tuning" ceiling with a hybrid hero pipeline: six bespoke focal scenes, four LODs each, true bevel geometry, KTX2 textures, GPU instancing, SMAA output, opaque depth-correct transitions, copy-safe camera composition and physical-device benchmark evidence.

## Build

```bash
npm ci
python -m pip install -r requirements-assets.txt
npm install --no-save --package-lock=false --ignore-scripts \
  @gltf-transform/core@4.2.1 @gltf-transform/extensions@4.2.1 \
  ktx2-encoder@0.6.0 sharp@0.34.5
npm run assets:r6
npm run typecheck
npm run validate:corporate:r6
npm run validate:r6:materials
npm run validate:r6:budgets
npm run qa:r6
npm run build
```

## Visual QA shortcuts

- `/?quality=high&chapter=0`
- `/?quality=high&chapter=1`
- … through `chapter=5`
- `/?quality=high&benchmark=1` for physical-laptop evidence

## Hero sources

`assets-source/r6/authoring/` contains one scene module per hero plus shared hard-surface helpers. Runtime hero GLBs live under `public/models/r6/hero/<scene>/`.

## Release status interpretation

Code/asset/CI/Vercel gates can be completed automatically. The SOW's physical mid-range laptop FPS gate is intentionally not self-certified: run the on-device benchmark and retain its exported JSON before contractual performance sign-off.

See `docs/corporate/R6_HERO_FIDELITY_IMPLEMENTATION.md` and `docs/R6_CAVEATS.md`.
