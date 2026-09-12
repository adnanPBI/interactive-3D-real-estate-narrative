import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const manifest = JSON.parse(fs.readFileSync("public/models/r6/manifest.json", "utf8"));
const max = (lod, key) => Math.max(...manifest.scenes.map((scene) => scene.lods[lod][key]));

test("R6 conservative active-scene budgets fit high and medium gates", () => {
  assert.ok(max("lod0", "triangles") + max("lod1", "triangles") + 18000 <= 220000);
  assert.ok(max("lod1", "triangles") + max("lod2", "triangles") + 18000 <= 120000);
  assert.ok(max("lod0", "meshGroups") + max("lod1", "meshGroups") + 16 <= 120);
  assert.ok(max("lod1", "meshGroups") + max("lod2", "meshGroups") + 16 <= 80);
});
