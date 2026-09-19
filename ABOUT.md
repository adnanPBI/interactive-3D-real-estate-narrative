# About this project

## Project summary

**Interactive 3D Real-Estate Narrative / Convalt Energy 3D Web** is a real-time architectural storytelling experience built for the browser.

The project uses procedural and authored 3D infrastructure scenes to communicate a connected energy ecosystem through six interactive chapters:

1. Integrated campus
2. Solar manufacturing
3. Power generation
4. Data centers
5. Recycling
6. Connected campus / project pipeline

The current production implementation is focused on **Convalt Energy** and presents the company as an integrated infrastructure platform spanning manufacturing, renewable power, data-center infrastructure, and circular material recovery.

Production site:

https://convalt-energy-r612-prod.onrender.com/

Repository:

https://github.com/adnanPBI/interactive-3D-real-estate-narrative

---

## What makes the project different

This is not a collection of static 3D renders placed behind a website.

The application combines:

- live WebGL rendering;
- real-time camera choreography;
- responsive scene composition;
- procedural architectural generation;
- physically based materials;
- runtime industrial motion;
- deterministic asset generation;
- multiple LOD tiers;
- fallback rendering;
- desktop/mobile-specific framing;
- production validation and deployment automation.

The goal is to make the infrastructure itself part of the narrative.

---

## Experience philosophy

The site follows several core principles.

### 1. Architecture is the hero

Buildings, process equipment, energy systems, solar arrays, substations, cooling plants, recycling equipment, and connected utilities are treated as primary storytelling objects.

The 3D environment should feel like an integrated site rather than a set of disconnected product renders.

### 2. Motion must have a physical reason

Runtime motion is reserved for systems that benefit from movement:

- turbines;
- manufacturing carriers;
- gantry systems;
- process flow;
- restrained environmental effects.

Decorative floating objects or machinery with no believable support are avoided.

### 3. Real-time composition must remain editorially readable

Every chapter is framed independently for:

- desktop;
- tablet;
- mobile.

The 3D subject and the editorial copy must coexist without the model becoming too small, clipping important geometry, or obscuring the text.

### 4. Geometry ownership must be unambiguous

A recurring production rule is:

> One architectural mass should have one authoritative geometry source.

Legacy context geometry is filtered when R6 replaces it. This prevents overlapping shells, shimmer, flicker, z-fighting, and duplicated industrial equipment.

### 5. Fallback behavior is part of the product

The experience must degrade gracefully when:

- WebGL is unavailable;
- the graphics context is lost;
- the device requires a lower quality tier;
- reduced-motion behavior is requested.

---

## The six hero environments

### Integrated campus

A campus-scale view combining:

- architecture;
- renewable energy systems;
- electrical infrastructure;
- solar equipment;
- landscape;
- service systems;
- animated wind turbines.

This scene acts as the visual thesis for the whole platform.

The current clean-context pipeline deliberately removes unwanted legacy roads and the former long rear strip that visually read as an access road in the production camera.

### Solar manufacturing

A high-bay industrial manufacturing environment featuring:

- production lines;
- conveyors;
- robotics/process equipment;
- gantry systems;
- rooftop mechanical equipment;
- glazing;
- process lighting;
- manufacturing-specific PBR materials.

This hero receives the most specialized material pipeline and source-identity validation.

### Power generation

A utility-scale renewable-energy scene combining:

- solar field geometry;
- electrical collection;
- transformers;
- substation infrastructure;
- BESS systems;
- animated turbines.

The design emphasizes the connection between generation and grid infrastructure.

### Data centers

A large technical building and cooling environment with:

- main data-center architecture;
- cooling systems;
- pipework;
- rooftop equipment;
- service infrastructure;
- electrical support equipment.

The scene intentionally avoids the former floating runtime fan overlay; mechanical equipment should appear physically grounded and authored into the facility.

### Recycling

A circular-material-recovery environment containing:

- intake and transfer systems;
- conveyors;
- sorting equipment;
- drums;
- baling/process zones;
- industrial hall architecture;
- material handling areas.

The environment is intended to communicate process flow without looking like a generic warehouse.

### Connected campus

A multi-building infrastructure environment that closes the narrative by showing separate infrastructure functions as one connected system.

It combines:

- multiple architectural volumes;
- utility infrastructure;
- renewable energy;
- mechanical systems;
- landscape;
- runtime turbines.

---

## Procedural architecture

A major part of the project is generated procedurally using Python and Trimesh.

Procedural authoring is used for systems such as:

- building shells;
- bevelled architectural volumes;
- roof detailing;
- facade systems;
- louvers;
- railings;
- pipe racks;
- cable trays;
- substations;
- transformer equipment;
- solar systems;
- industrial machinery;
- landscape context.

This approach makes the scenes reproducible and allows geometry defects to be fixed at the source rather than patched only in screenshots.

---

## R6 scene model

The semantic R6 hero IDs are:

```text
integrated-campus
manufacturing-line
substation-bess
data-center-cooling
recycling-intake
connected-campus
```

Each hero participates in the R6 LOD structure:

```text
lod0.glb
lod1.glb
lod2.glb
proxy.glb
```

The lower-detail assets are produced and validated even when the primary production presentation remains on full-detail hero geometry.

---

## Rendering approach

The runtime combines:

- React Three Fiber;
- Three.js;
- ACES filmic tone mapping;
- PBR materials;
- environment lighting;
- dynamic shadows;
- responsive cameras;
- post-processing;
- SMAA;
- restrained SSAO;
- adaptive performance controls.

Materials are treated by physical category rather than applying identical settings to every object.

Examples include:

- dielectric painted metal;
- metallic steel;
- metallic aluminum;
- rough concrete;
- rubber;
- transparent industrial glass;
- emissive process surfaces.

---

## Anti-flicker / geometry policy

Several revisions of the project focused on removing visible geometry instability.

Common causes addressed by the current pipeline include:

- stacked R4/R5/R6 architecture;
- near-coplanar surfaces;
- duplicate mechanical systems;
- overlapping pipe racks;
- duplicate building masses;
- transparent depth conflicts;
- static and runtime turbines occupying the same space.

The R6.1.7 clean-context pipeline is designed around a simple rule:

> Context provides supporting infrastructure. R6 owns replacement hero architecture.

This rule is enforced by procedural generation and regression tests.

---

## Runtime motion

Runtime motion is implemented only where it contributes to the industrial story.

Current examples include:

- rotating turbines;
- manufacturing carriers;
- gantry movement;
- subtle process effects.

The motion system also respects reduced-motion behavior.

---

## Performance strategy

The project is designed to remain practical for browser deployment.

Performance techniques include:

- quality tiers;
- bounded device-pixel ratio;
- LOD infrastructure;
- proxy assets;
- deterministic mesh reduction;
- limited shadow budgets;
- selective post-processing;
- optimized GLB delivery;
- KTX2 textures;
- performance governor logic;
- WebGL fallback behavior.

A software renderer can validate functional behavior, but real physical-device performance should be measured separately.

---

## Deployment model

Production is deployed to Render from the `main` branch.

The Render build process regenerates and validates the R6 runtime assets before the Next.js production build.

Important deployment configuration lives in:

- `render.yaml`
- `scripts/prepare-render-r612-assets.sh`
- `package.json`

Because assets are generated during the production build, procedural-source changes can alter production GLBs even when the binary files are not manually edited.

---

## QA philosophy

Visual quality is treated as a release requirement rather than a final manual check.

The repository includes checks for:

- TypeScript correctness;
- source identity;
- asset presence;
- GLB validity;
- LOD and proxy relationships;
- CPU fallback generation;
- WebGL fallback behavior;
- cinematic materials;
- geometry winding;
- duplicate/overlapping geometry regressions;
- six-chapter browser presentation.

The project also maintains staged release and production-evidence tooling.

---

## Design direction

The visual target is:

- cinematic but restrained;
- architectural rather than game-like;
- industrial but premium;
- technically believable;
- neutral in palette;
- high contrast where machinery needs definition;
- clean enough to coexist with corporate typography.

The site should feel closer to a high-end architectural visualization or infrastructure film than to a conventional product landing page.

---

## Intended reuse

Although the current production implementation is tailored to Convalt Energy, the architecture can be adapted to other real-time 3D developments such as:

- industrial campuses;
- real-estate developments;
- manufacturing facilities;
- data-center campuses;
- renewable-energy projects;
- logistics hubs;
- infrastructure masterplans;
- technology campuses;
- interactive masterplan storytelling.

The procedural asset strategy makes the codebase especially useful as a reference for future real-time architectural narrative projects.

---

## Project provenance and limitations

The 3D environments in this repository are **visual-development assets**.

They are not:

- surveyed as-built geometry;
- BIM deliverables;
- construction documents;
- engineering drawings;
- safety documentation;
- regulatory submissions.

Visual geometry should not be interpreted as authoritative site data.

Approved engineering/CAD/BIM sources should be used wherever exact technical or construction accuracy is required.

---

## Suggested GitHub repository About text

GitHub's repository sidebar can use the following concise description:

> Real-time procedural 3D infrastructure narrative built with Next.js, React Three Fiber, Three.js and Trimesh — six cinematic energy-campus hero scenes with WebGL, PBR materials, responsive cameras, LODs and Render deployment.

Suggested website:

```text
https://convalt-energy-r612-prod.onrender.com/
```

Suggested topics:

```text
threejs
react-three-fiber
nextjs
webgl
3d
architectural-visualization
procedural-generation
trimesh
glb
gltf
real-time-3d
energy
infrastructure
interactive-storytelling
render
```

---

## Maintainer notes

When extending the project:

- fix geometry at the procedural source whenever possible;
- avoid adding duplicate hero architecture into context layers;
- keep desktop and mobile framing separate;
- preserve fallback behavior;
- validate all six chapters after global rendering changes;
- check real-device performance before claiming 60 FPS;
- keep the production asset pipeline deterministic.

For implementation details, build commands, deployment, and QA instructions, see [README.md](README.md).
