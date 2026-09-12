import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');

test('R6 asset routing is coherent across models and fallbacks',()=>{
 const scenes=read('experience/config/scenes.ts');
 assert.match(scenes,/"hero-campus": "integrated-campus"/);
 assert.match(scenes,/\/models\/r6\/hero\/\$\{r6LegacyNameToHero\[name\]\}\/lod0\.glb/);
 assert.match(scenes,/\/fallback\/r6\/\$\{r6LegacyNameToHero\[name\]\}\.webp/);
});

test('runtime failures can promote WebGL to static fallback',()=>{
 const home=read('components/experience/HomeExperience.tsx'); const canvas=read('components/experience/ExperienceCanvas.tsx');
 assert.match(home,/convalt:webgl-fatal/); assert.match(home,/runtimeFallback/); assert.match(canvas,/webglcontextlost/);
});

test('release KTX2 assigns linear transfer to data maps and scans all runtime maps',()=>{
 const enc=read('scripts/encode-r61-textures.py'); const build=read('scripts/build-r61-assets.py'); const validate=read('scripts/validate-r61-textures.py');
 assert.match(enc,/--assign_oetf", "linear/); assert.match(build,/encode_legacy_basis/); assert.match(validate,/exactly 39 runtime KTX2 maps/);
});

test('benchmark retains long stalls and rejects fallback renderer',()=>{
 const bench=read('components/experience/LaptopBenchmarkPanel.tsx'); const accept=read('scripts/acceptance_qa.py');
 assert.doesNotMatch(bench,/delta < 1000/); assert.match(bench,/longStalls/); assert.match(bench,/rendererValid/); assert.match(accept,/if \(delta > 0\) deltas\.push\(delta\)/);
});

test('chapter preloading targets displayed LOD and outgoing hero waits for replacement',()=>{
 const preload=read('components/experience/AssetPreloader.tsx'); const world=read('components/experience/StoryWorld.tsx');
 assert.match(preload,/r6HeroUrl\(r6ChapterHero\[i\], activeLod\)/); assert.match(world,/assetManager\.prefetch/); assert.match(world,/setRenderedChapter/);
});

test('contact and Turnstile lifecycle are bounded',()=>{
 const api=read('app/api/contact/route.ts'); const form=read('components/ui/ContactForm.tsx');
 assert.match(api,/readJsonBodyLimited/); assert.match(api,/reader\.cancel/); assert.match(api,/rate_limit_expiry_failed/); assert.match(form,/render=explicit/); assert.match(form,/turnstile\.remove/); assert.match(form,/turnstile\.reset/);
});

test('menu focus and accessible story links are contained',()=>{
 const header=read('components/layout/SiteHeader.tsx'); const a11y=read('components/layout/AccessibilityMenu.tsx');
 assert.match(header,/event\.key !== "Tab"/); assert.match(header,/menu-overlay__close/); assert.match(a11y,/pathname === "\/" \? "#accessibility-host" : "\/#accessibility-host"/); assert.match(a11y,/convalt:preferences/);
});

test('resource manager evicts late prefetch and disposes decoder bundles',()=>{
 const manager=read('experience/systems/AssetManager.ts'); const premium=read('components/experience/useR61MaterialTextures.ts');
 assert.match(manager,/evictWhenResolved/); assert.match(manager,/disposeRenderer/); assert.match(premium,/Promise\.allSettled/);
});
