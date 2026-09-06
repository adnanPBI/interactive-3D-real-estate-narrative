import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

type Entry = {
  gltf?: GLTF;
  promise?: Promise<GLTF>;
  refs: number;
  pinnedUntil: number;
};

type LoaderBundle = {
  loader: GLTFLoader;
  ktx2: KTX2Loader;
  draco: DRACOLoader;
};

function disposeTexture(value: unknown) {
  if (value instanceof THREE.Texture) value.dispose();
}

function disposeMaterial(material: THREE.Material) {
  const record = material as THREE.Material & Record<string, unknown>;
  Object.values(record).forEach(disposeTexture);
  material.dispose();
}

/** Release GPU resources owned by a GLTF once no mounted scene references it. */
export function disposeGLTF(gltf: GLTF) {
  gltf.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.filter(Boolean).forEach(disposeMaterial);
  });
}

/**
 * Small ref-counted asset manager for the story experience.
 *
 * - GLTFLoader accepts Meshopt or Draco-compressed geometry.
 * - KTX2Loader accepts Basis/KTX2 textures from /basis/.
 * - DRACOLoader uses decoder assets copied to /draco/ at install time.
 * - current/next scenes are retained, future scenes can be prefetched.
 * - released scenes are disposed after a grace period to avoid scroll thrash.
 */
export class AssetManager {
  private entries = new Map<string, Entry>();
  private bundles = new WeakMap<THREE.WebGLRenderer, LoaderBundle>();

  private bundle(renderer: THREE.WebGLRenderer): LoaderBundle {
    const existing = this.bundles.get(renderer);
    if (existing) return existing;

    const ktx2 = new KTX2Loader()
      .setTranscoderPath("/basis/")
      .setWorkerLimit(2)
      .detectSupport(renderer);
    const draco = new DRACOLoader()
      .setDecoderPath("/draco/")
      .setWorkerLimit(2);
    const loader = new GLTFLoader();
    loader.setKTX2Loader(ktx2);
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);

    const bundle = { loader, ktx2, draco };
    this.bundles.set(renderer, bundle);
    return bundle;
  }

  private ensure(url: string, renderer: THREE.WebGLRenderer) {
    let entry = this.entries.get(url);
    if (!entry) {
      entry = { refs: 0, pinnedUntil: 0 };
      this.entries.set(url, entry);
    }

    if (!entry.gltf && !entry.promise) {
      const { loader } = this.bundle(renderer);
      entry.promise = loader.loadAsync(url)
        .then((gltf) => {
          entry!.gltf = gltf;
          entry!.promise = undefined;
          return gltf;
        })
        .catch((error) => {
          this.entries.delete(url);
          throw error;
        });
    }

    return entry;
  }

  async retain(url: string, renderer: THREE.WebGLRenderer): Promise<GLTF> {
    const entry = this.ensure(url, renderer);
    entry.refs += 1;
    if (entry.gltf) return entry.gltf;
    return entry.promise!;
  }

  async prefetch(url: string, renderer: THREE.WebGLRenderer, pinMs = 15000) {
    const entry = this.ensure(url, renderer);
    entry.pinnedUntil = Math.max(entry.pinnedUntil, Date.now() + pinMs);
    try {
      return entry.gltf ?? await entry.promise!;
    } catch {
      // A failed prefetch must not break the current scene. The mounted scene hook
      // will report the asset error if/when the user actually reaches the chapter.
      return undefined;
    }
  }

  release(url: string) {
    const entry = this.entries.get(url);
    if (!entry) return;
    entry.refs = Math.max(0, entry.refs - 1);
    if (typeof window !== "undefined") {
      window.setTimeout(() => this.disposeIfUnused(url), 8000);
    }
  }

  prune(keep: ReadonlySet<string>) {
    for (const [url] of this.entries) {
      if (!keep.has(url)) this.disposeIfUnused(url);
    }
  }

  private disposeIfUnused(url: string) {
    const entry = this.entries.get(url);
    if (!entry || entry.refs > 0 || entry.promise || entry.pinnedUntil > Date.now()) return;
    if (entry.gltf) disposeGLTF(entry.gltf);
    this.entries.delete(url);
  }

  debugSnapshot() {
    return [...this.entries.entries()].map(([url, entry]) => ({
      url,
      refs: entry.refs,
      loaded: Boolean(entry.gltf),
      loading: Boolean(entry.promise),
      pinned: entry.pinnedUntil > Date.now(),
    }));
  }
}

export const assetManager = new AssetManager();
