import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

type Entry = { gltf?: GLTF; promise?: Promise<GLTF>; refs: number; pinnedUntil: number; evictWhenResolved?: boolean };
type LoaderBundle = { loader: GLTFLoader; ktx2: KTX2Loader; draco: DRACOLoader };

function disposeTexture(value: unknown) { if (value instanceof THREE.Texture) value.dispose(); }
function disposeMaterial(material: THREE.Material) { const record = material as THREE.Material & Record<string, unknown>; Object.values(record).forEach(disposeTexture); material.dispose(); }
export function disposeGLTF(gltf: GLTF) {
  gltf.scene.traverse((object) => { const mesh = object as THREE.Mesh; if (!mesh.isMesh) return; mesh.geometry?.dispose(); const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; materials.filter(Boolean).forEach(disposeMaterial); });
}

export class AssetManager {
  private entries = new Map<string, Entry>();
  private bundles = new WeakMap<THREE.WebGLRenderer, LoaderBundle>();
  private bundle(renderer: THREE.WebGLRenderer): LoaderBundle {
    const existing = this.bundles.get(renderer); if (existing) return existing;
    const ktx2 = new KTX2Loader().setTranscoderPath("/basis/").setWorkerLimit(2).detectSupport(renderer);
    const draco = new DRACOLoader().setDecoderPath("/draco/").setWorkerLimit(2);
    const loader = new GLTFLoader(); loader.setKTX2Loader(ktx2); loader.setDRACOLoader(draco); loader.setMeshoptDecoder(MeshoptDecoder);
    const bundle = { loader, ktx2, draco }; this.bundles.set(renderer, bundle); return bundle;
  }
  private ensure(url: string, renderer: THREE.WebGLRenderer) {
    let entry = this.entries.get(url); if (!entry) { entry = { refs: 0, pinnedUntil: 0 }; this.entries.set(url, entry); }
    if (!entry.gltf && !entry.promise) {
      const { loader } = this.bundle(renderer);
      entry.promise = loader.loadAsync(url).then((gltf) => {
        entry!.gltf = gltf; entry!.promise = undefined;
        if (entry!.evictWhenResolved && entry!.refs === 0 && entry!.pinnedUntil <= Date.now()) { disposeGLTF(gltf); this.entries.delete(url); }
        return gltf;
      }).catch((error) => { this.entries.delete(url); throw error; });
    }
    return entry;
  }
  async retain(url: string, renderer: THREE.WebGLRenderer): Promise<GLTF> { const entry = this.ensure(url, renderer); entry.refs += 1; if (entry.gltf) return entry.gltf; return entry.promise!; }
  async prefetch(url: string, renderer: THREE.WebGLRenderer, pinMs = 15000) {
    const entry = this.ensure(url, renderer); entry.pinnedUntil = Math.max(entry.pinnedUntil, Date.now() + pinMs);
    if (typeof window !== "undefined") window.setTimeout(() => this.disposeIfUnused(url), pinMs + 50);
    try { return entry.gltf ?? await entry.promise!; } catch { return undefined; }
  }
  release(url: string) { const entry = this.entries.get(url); if (!entry) return; entry.refs = Math.max(0, entry.refs - 1); if (typeof window !== "undefined") window.setTimeout(() => this.disposeIfUnused(url), 8000); }
  prune(keep: ReadonlySet<string>) { for (const [url, entry] of this.entries) { if (keep.has(url)) { entry.evictWhenResolved = false; continue; } if (entry.promise) entry.evictWhenResolved = true; else this.disposeIfUnused(url); } }
  disposeRenderer(renderer: THREE.WebGLRenderer) { const bundle = this.bundles.get(renderer); if (!bundle) return; bundle.ktx2.dispose(); bundle.draco.dispose(); this.bundles.delete(renderer); }
  private disposeIfUnused(url: string) { const entry = this.entries.get(url); if (!entry || entry.refs > 0 || entry.promise || entry.pinnedUntil > Date.now()) return; if (entry.gltf) disposeGLTF(entry.gltf); this.entries.delete(url); }
  debugSnapshot() { return [...this.entries.entries()].map(([url, entry]) => ({ url, refs: entry.refs, loaded: Boolean(entry.gltf), loading: Boolean(entry.promise), pinned: entry.pinnedUntil > Date.now() })); }
}
export const assetManager = new AssetManager();
