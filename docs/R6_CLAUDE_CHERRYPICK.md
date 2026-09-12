# Claude Scaffold Review — R6 Cherry-Pick Record

Two supplied Claude scaffolds were inspected before R6 implementation.

## `convalt-3d-site-claude.zip`

Useful ideas retained and adapted:

- **Canvas failure boundary / WebGL context-loss fallback.** Claude's `Scene3D.tsx` correctly separates thrown React/WebGL errors from `webglcontextlost` events. R6 implements both with `CanvasErrorBoundary.tsx` and `ContextLossGuard.tsx`, routing failures to the authored static frame path.
- **Conservative capability heuristic.** Claude's `useAdaptiveQuality.ts` uses WebGL capability, CPU/memory hints and `navigator.connection.saveData`. R6 retains the Save-Data hint and combines it with the existing renderer/GPU heuristic.
- **Unified interaction idea.** Claude's `InputManager.tsx` sends mouse click, wheel and keyboard intent to one narrative progress controller. R6 keeps its existing discrete chapter controller (wheel, touch, keyboard) and adds non-interactive mouse click-to-advance without replacing the SOW-aligned chapter navigation.
- **GPU instancing principle.** Claude's repeated scene elements reinforced the decision to keep solar fields, trees and turbines on `InstancedMesh` paths.
- **ACES/sRGB renderer discipline.** Already present in R5, retained in R6.

Not copied directly:

- Claude's dark visual palette and broad Bloom/Vignette stack were not suitable for the client's calm neutral editorial direction.
- `@react-three/postprocessing` was not added as an application dependency. R6 uses Three's bundled `EffectComposer` + `SMAAPass` + `OutputPass`, keeping the runtime dependency surface smaller.
- Claude's continuous drag/scrub interaction was not adopted because the current product intentionally advances through discrete narrative chapters rather than a free scrub timeline.

## `convalt-energy-3d-web-r4-buildfix.zip`

This scaffold is structurally close to the earlier R4/R5 base. Its useful loader/validation patterns are already represented by the production codebase: ref-counted GLTF loading, KTX2/Draco/Meshopt decoder hooks, staged validation, fallback path and performance instrumentation. R6 extends those mechanisms instead of introducing a second competing asset manager.
