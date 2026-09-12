#!/usr/bin/env node
/** Convert every embedded R6 hero texture to Basis Universal KTX2.
 *
 * Authoring dependencies are deliberately not application dependencies. CI and
 * the asset-authoring workstation install them in a separate authoring step:
 *   npm install --no-save --ignore-scripts \
 *     @gltf-transform/core@4.2.1 @gltf-transform/extensions@4.2.1 \
 *     ktx2-encoder@0.6.0 sharp@0.34.5
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { ktx2 } from "ktx2-encoder/gltf-transform";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const heroRoot = path.join(root, "public/models/r6/hero");
const manifestPath = path.join(root, "public/models/r6/manifest.json");

const imageDecoder = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

for (const scene of manifest.scenes) {
  for (const [lod, item] of Object.entries(scene.lods)) {
    const filename = path.join(root, "public", item.file);
    const doc = await io.read(filename);
    const textures = doc.getRoot().listTextures();
    if (textures.length) {
      const isUASTC = lod === "lod0" || lod === "lod1";
      await doc.transform(ktx2({
        isUASTC,
        generateMipmap: true,
        imageDecoder,
        enableDebug: false,
      }));
      await io.write(filename, doc);
    }
    const bytes = await fs.readFile(filename);
    const textProbe = bytes.toString("latin1");
    item.bytes = bytes.byteLength;
    item.sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    item.textureEncoding = textures.length
      ? ((textProbe.includes("KHR_texture_basisu") || textProbe.includes("image/ktx2"))
          ? (lod === "lod0" || lod === "lod1" ? "KTX2/UASTC" : "KTX2/ETC1S")
          : "KTX2-ENCODE-FAILED")
      : "no-textures";
    item.textureCount = textures.length;
    console.log(`${scene.id.padEnd(18)} ${lod.padEnd(5)} ${item.textureEncoding.padEnd(16)} ${(item.bytes/1048576).toFixed(2)} MiB`);
  }
}
manifest.textureEncoding = "KTX2 Basis Universal: UASTC for LOD0/1, ETC1S for LOD2/proxy where source textures exist.";
manifest.generatedAt = new Date().toISOString();
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
