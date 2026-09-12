import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/models/r6/manifest.json"), "utf8"));

test("R6 ships six bespoke heroes and four LODs each", () => {
  assert.equal(manifest.scenes.length, 6);
  for (const scene of manifest.scenes) {
    assert.match(scene.authoring, /^assets-source\/r6\/authoring\/hero_/);
    for (const lod of ["lod0", "lod1", "lod2", "proxy"]) {
      assert.ok(scene.lods[lod], `${scene.id} ${lod}`);
      assert.ok(fs.existsSync(path.join(root, "public", scene.lods[lod].file)));
    }
  }
});

test("R6 hero LOD0 texture policy is KTX2 after release authoring", () => {
  for (const scene of manifest.scenes) {
    const item = scene.lods.lod0;
    assert.ok(Number.isInteger(item.textureCount) && item.textureCount >= 0, `${scene.id} textureCount`);
    if (item.textureCount > 0) assert.match(item.textureEncoding, /^KTX2\//);
  }
});
