# R6.1.2 Real-Time Procedural Runtime

This extension keeps the reviewed R6.1.2 authored hero GLBs, LOD policy, AssetManager, post-FX, fallback, shadow lifecycle and cinematic chapter controller intact. It adds an additive procedural world layer around the premium hero assets.

## Architecture

The procedural runtime is deliberately **not a game conversion**. The six authored corporate chapters remain the story and visual anchors. The new layer provides continuously moving industrial context through deterministic, recyclable world segments:

- instanced architectural/service volumes;
- instanced solar fields;
- instanced service traffic;
- emissive energy beacons;
- animated wind turbines;
- endless corridor motion with per-instance wrapping;
- chapter-specific density, palette and infrastructure probabilities;
- live time-of-day and weather grading;
- deterministic seed-based layouts for reproducible QA and client review.

No procedural element replaces or mutates the canonical R6 hero GLBs.

## Runtime controls

The default profile is conservative `ambient` motion. The browser URL can override the runtime without rebuilding:

```text
?runner=cinematic&speed=1.25&density=1.15&wind=1.3&traffic=.8&time=18&weather=dusk&seed=investor-demo
```

Supported parameters:

| Parameter | Values | Meaning |
| --- | --- | --- |
| `procedural` / `proc` | `0`, `1` | Disable/enable procedural context |
| `runner` | `off`, `ambient`, `cinematic` | Streaming intensity preset |
| `seed` | string | Deterministic layout seed |
| `speed` | `0..3` | World-streaming multiplier |
| `density` | `0.25..1.6` | Procedural population multiplier |
| `wind` | `0..2.5` | Turbine animation multiplier |
| `traffic` | `0..2.5` | Service-traffic movement multiplier |
| `time` | `0..24` | Live lighting time of day |
| `weather` | `profile`, `clear`, `haze`, `dusk` | Atmospheric grade |

The runtime is also controllable from the console or QA automation:

```js
window.__CONVALT_PROCEDURAL__?.get();
window.__CONVALT_PROCEDURAL__?.set({ speed: 1.35, density: 1.2, weather: "haze" });
window.__CONVALT_PROCEDURAL__?.reset();
```

or through an event:

```js
window.dispatchEvent(new CustomEvent("convalt:procedural-update", {
  detail: { timeOfDay: 18.4, wind: 1.5 }
}));
```

## Chapter profiles

Each chapter uses a different procedural composition rather than repeating one generic environment:

- **Hero / integrated campus:** balanced campus structures, solar context and restrained traffic.
- **Manufacturing:** denser industrial/service architecture and logistics movement.
- **Generation:** strongest solar/turbine presence and higher wind profile.
- **Data centers:** denser service structures and stronger energy beacons.
- **Recycling:** logistics-heavy context with reduced energy hardware.
- **Close / connected campus:** mixed infrastructure with a warmer dusk-ready presentation.

## Performance design

The procedural layer is designed to stay subordinate to the R6.1.2 hero budget:

- repeated objects use `InstancedMesh`;
- layouts are deterministic and memoized per chapter/seed/density;
- world elements are wrapped and reused rather than allocated/destroyed continuously;
- moving turbine shadows are High-tier only;
- Medium tier uses fewer world segments and lower density;
- reduced-motion preference stops streaming, traffic and turbine motion;
- procedural mode can be disabled completely without changing the authored experience.

## Endless streaming behavior

The implementation does not teleport one parent world when it reaches the end. Each procedural instance wraps independently inside a fixed corridor. This avoids a synchronized whole-scene reset and creates visually continuous movement with stable memory use.

## Acceptance expectations

A release candidate should prove:

1. the six canonical R6 heroes still load with their existing LOD behavior;
2. the procedural layer is deterministic for an identical seed/profile;
3. `Math.random()` is not used by procedural generation;
4. reduced-motion disables world motion;
5. fallback mode remains independent from the procedural layer;
6. Medium and High tiers stay within performance expectations;
7. browser QA covers `ambient`, `cinematic`, `procedural=0`, dusk/haze and at least two seeds;
8. physical target-laptop FPS evidence is still required before a production performance claim.
