import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (name) => fs.readFileSync(name, "utf8");

test("R6 combines native AA with SMAA", () => {
  assert.match(read("components/experience/ExperienceCanvas.tsx"), /antialias: true/);
  assert.match(read("components/experience/R6PostFX.tsx"), /SMAAPass/);
});

test("R6 solid scene transition is not generic transparent blending", () => {
  const source = read("components/experience/SceneAsset.tsx");
  assert.match(source, /alphaHash = true/);
  assert.match(source, /standard\.transparent = false/);
  assert.match(source, /transparentAuthored/);
});

test("R6 allows one active LOD0 and uses GPU instances", () => {
  assert.match(read("components/experience/ChapterScene.tsx"), /sceneIndex === activeChapter \? "lod0" : "lod1"/);
  const instances = read("components/experience/R6InstancedDetails.tsx") + read("components/experience/InstancedSolarField.tsx");
  assert.ok((instances.match(/<instancedMesh/g) ?? []).length >= 4);
});
