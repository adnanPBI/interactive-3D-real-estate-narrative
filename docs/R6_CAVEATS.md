# R6 Caveats and Acceptance Boundaries

## 1. Visual-development models, not engineering data

The six R6 hero moments are separately authored hard-surface visual-development scenes. They materially improve edge treatment, focal equipment and scene specificity, but they are not derived from Convalt CAD/BIM/as-built drawings. Exact engineering geometry requires client-supplied source data or a dedicated DCC/CAD asset-production engagement.

## 2. Browser real-time fidelity has a ceiling

R6 is designed to be premium real-time WebGL, not an offline V-Ray/Unreal cinematic render. Concept-board parity can only be pursued while preserving the client's browser, mobile and 60-fps constraints. Thin sub-pixel geometry will always be more alias-prone than large silhouette geometry; R6 addresses this with bevels, native AA, SMAA, anisotropic filtering and composition distance.

## 3. KTX2 is an authoring/release step

Raw local hero generation produces embedded source textures. The release workflow converts them to KTX2 UASTC/ETC1S before validation and deployment. A build that has not completed `assets:r6:textures` is not an R6 release candidate.

## 4. Physical laptop acceptance cannot be certified by CI

GitHub Actions and Vercel builds validate code, assets and static budgets. They do not prove the SOW's physical mid-range laptop frame-rate criterion. The shipped `?benchmark=1&quality=high` harness measures all six chapters and exports JSON containing average FPS, minimum 5-second FPS, 1% low, p95/p99 frame time, calls, triangles, DPR, active LOD and SMAA state.

The benchmark passes only if every chapter meets:
- average FPS >= 58,
- minimum 5-second FPS >= 55,
- 1% low >= 45 FPS,
- p95 frame time <= 20 ms,
- tier triangle/draw-call limits are not exceeded,
- no budget warning occurs,
- SMAA never enters emergency-off mode.

Until that test runs on the agreed physical laptop, the hardware-specific 60-fps acceptance item remains pending.

## 5. High vs medium fidelity

High tier may render one LOD0 hero plus one LOD1 transition neighbour. Medium deliberately starts at LOD1 and uses LOD2 for the neighbour. Recent mobile and integrated GPUs therefore do not receive the exact same geometry as a discrete-GPU desktop.

## 6. Asset payload

R6 trades some payload for visible fidelity. Current/adjacent streaming, LODs, KTX2 and instancing are therefore functional requirements, not optional optimization work.
