#!/usr/bin/env python3
"""Build the R6 manually-authored hero pack with four LODs per chapter.

R6 deliberately does *not* generate one generic campus six times.  Each hero is
laid out in its own source module under assets-source/r6/authoring/.  Those source
modules use shared hard-surface primitives (including true chamfer geometry), but
all scene composition and focal equipment is authored per chapter.

The R5/R3/R2 assets are reused only as progressively lighter context layers:
  LOD0 = R5 high context + bespoke R6 hero
  LOD1 = R5 medium context + reduced bespoke R6 hero
  LOD2 = Stage 3 context + signature R6 massing
  proxy = Stage 2 context + minimal R6 massing

The resulting GLBs are then passed through encode-r6-ktx2.mjs, which converts
embedded textures to KTX2 Basis UASTC (LOD0/1) or ETC1S (LOD2/proxy).
"""
from __future__ import annotations
from dataclasses import dataclass
from hashlib import sha256
import importlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import trimesh

ROOT = Path(__file__).resolve().parents[1]
AUTHORING = ROOT / "assets-source" / "r6" / "authoring"
OUT = ROOT / "public" / "models" / "r6"
HERO_OUT = OUT / "hero"
FALLBACK = ROOT / "public" / "fallback" / "r6"
TMP = ROOT / ".r6-raw"
EDITABLE = ROOT / "assets-source" / "r6" / "editable"
for p in (OUT, HERO_OUT, FALLBACK, TMP, EDITABLE): p.mkdir(parents=True, exist_ok=True)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None: raise RuntimeError(f"Cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

r4 = load_module(ROOT / "scripts" / "generate-r4-assets.py", "r6_r4")
r5 = load_module(ROOT / "scripts" / "generate-r5-hybrid-assets.py", "r6_r5")

# The R5 import intentionally upgrades R4 material roughness/metalness. Keep that
# material policy for the bespoke R6 geometry until the KTX2 conversion stage.

AUTHORING_STR = str(AUTHORING)
if AUTHORING_STR not in sys.path: sys.path.insert(0, AUTHORING_STR)

@dataclass(frozen=True)
class Context:
    r4: object
    r5: object
ctx = Context(r4=r4, r5=r5)

SCENES = [
    ("hero-campus", "hero_integrated", "Integrated campus"),
    ("manufacturing", "hero_manufacturing", "Manufacturing line"),
    ("power-generation", "hero_generation", "Power / substation"),
    ("data-centers", "hero_datacenter", "Data center cooling"),
    ("recycling", "hero_recycling", "Recycling intake"),
    ("closing-platform", "hero_connected", "Connected campus"),
]
LODS = ("lod0", "lod1", "lod2", "proxy")
BASE_PATHS = {
    "lod0": lambda name: ROOT / "public" / "models" / "r5" / "high" / f"{name}.glb",
    "lod1": lambda name: ROOT / "public" / "models" / "r5" / "medium" / f"{name}.glb",
    "lod2": lambda name: ROOT / "public" / "models" / "stage3" / f"{name}.glb",
    "proxy": lambda name: ROOT / "public" / "models" / "stage2" / f"{name}.glb",
}


def add_scene(target: trimesh.Scene, source: trimesh.Scene, prefix: str):
    # dump() applies node transforms before returning meshes, avoiding assumptions
    # about whether an imported GLB has baked transforms.
    dumped = source.dump(concatenate=False)
    if isinstance(dumped, trimesh.Trimesh): dumped = [dumped]
    for index, geom in enumerate(dumped):
        if not isinstance(geom, trimesh.Trimesh): continue
        target.add_geometry(geom.copy(), node_name=f"{prefix}-{index}", geom_name=f"{prefix}-{index}")


def combine(base: trimesh.Scene, detail: trimesh.Scene, name: str):
    out = trimesh.Scene()
    add_scene(out, base, f"{name}-context")
    add_scene(out, detail, f"{name}-hero")
    return out


def metrics(path: Path):
    loaded = trimesh.load(path, force="scene")
    geoms = list(loaded.geometry.values())
    return {
        "bytes": path.stat().st_size,
        "triangles": int(sum(len(g.faces) for g in geoms)),
        "vertices": int(sum(len(g.vertices) for g in geoms)),
        "meshGroups": len(geoms),
        "materials": sorted({getattr(getattr(g.visual, "material", None), "name", "unnamed") for g in geoms}),
        "sha256": sha256(path.read_bytes()).hexdigest(),
    }


def hero_fallback_svg(name: str, index: int, label: str):
    # A deliberately art-directed low-power fallback: warm editorial ground,
    # restrained infrastructure silhouette, solar/wind/industrial cues and a
    # chapter-specific accent composition. The DOM copy remains live above it.
    accents = ["#b97828", "#d39b50", "#466482", "#6a7a6d", "#b97828", "#466482"]
    accent = accents[index]
    building_shift = [0, -18, 20, 8, -12, 4][index]
    solar = index in (0,2,5)
    turbine = index in (0,2,5)
    recycle = index == 4
    data = index == 3
    factory = index == 1
    extra = ""
    if solar:
        extra += ''.join(f'<path d="M {520+i*42} 405 l 32 -10 l 18 17 l -34 10 z" fill="#263b49" opacity=".9"/>' for i in range(7))
    if turbine:
        extra += '<g stroke="#f5f1e9" stroke-width="5" stroke-linecap="round"><path d="M935 375V240"/><path d="M935 245l-58 24"/><path d="M935 245l25-62"/><path d="M935 245l48 45"/></g>'
    if recycle:
        extra += '<g fill="#58615c"><circle cx="570" cy="420" r="38"/><circle cx="650" cy="420" r="33"/><rect x="710" y="382" width="120" height="76" rx="8"/></g>'
    if data:
        extra += '<g fill="#4d575a"><rect x="535" y="360" width="60" height="88" rx="4"/><rect x="610" y="340" width="60" height="108" rx="4"/><rect x="685" y="365" width="60" height="83" rx="4"/></g>'
    if factory:
        extra += '<g stroke="#4b5352" stroke-width="8"><path d="M500 420V250H910V420"/><path d="M500 250L570 210L640 250L710 210L780 250L850 210L910 250"/></g>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4eddc"/><stop offset="1" stop-color="#e8e3d8"/></linearGradient><radialGradient id="sun"><stop stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="shadow"><feGaussianBlur stdDeviation="14"/></filter></defs>
<rect width="1280" height="720" fill="url(#bg)"/><circle cx="820" cy="290" r="310" fill="url(#sun)" opacity=".7"/>
<ellipse cx="760" cy="515" rx="360" ry="70" fill="#5c5c57" opacity=".18" filter="url(#shadow)"/>
<g transform="translate({building_shift} 0)"><path d="M520 445V300h230v145z" fill="#a8aba7"/><path d="M750 445V335h200v110z" fill="#959a98"/><path d="M585 300v-55h112v55z" fill="#777d7c"/><g stroke="#6f7775" stroke-width="4" opacity=".8"><path d="M548 325h174"/><path d="M548 354h174"/><path d="M785 360h130"/><path d="M785 390h130"/></g><g fill="#eef1ed" opacity=".8"><rect x="552" y="365" width="40" height="48"/><rect x="606" y="365" width="40" height="48"/><rect x="660" y="365" width="40" height="48"/></g></g>
{extra}<path d="M440 486H1000" stroke="{accent}" stroke-width="4" opacity=".75"/><text x="1045" y="650" fill="#303334" font-family="Arial,sans-serif" font-size="14" letter-spacing="3">R6 · {label.upper()}</text>
</svg>'''


def main():
    if TMP.exists(): shutil.rmtree(TMP)
    TMP.mkdir(parents=True, exist_ok=True)
    manifest = {
        "stage": "6-r6-hero-fidelity",
        "revision": "r6.0",
        "provenance": "Six bespoke hand-authored Python scene blueprints over progressively lighter R5/R3/R2 context. Visual-development assets only; not client CAD/as-built engineering data.",
        "textureEncoding": "raw GLB generated here; encode-r6-ktx2.mjs converts embedded hero textures to KTX2 Basis.",
        "budgets": {
            "high": {"activeTriangles":220000,"drawCalls":120,"textureMemoryMB":180,"maxLod0Heroes":1},
            "medium": {"activeTriangles":120000,"drawCalls":80,"textureMemoryMB":100,"maxLod0Heroes":0},
        },
        "scenes": [],
    }
    for index,(asset_name,module_name,label) in enumerate(SCENES):
        module = importlib.import_module(module_name)
        scene_item = {"id": asset_name, "label": label, "authoring": f"assets-source/r6/authoring/{module_name}.py", "lods": {}}
        dest_dir = HERO_OUT / asset_name
        dest_dir.mkdir(parents=True, exist_ok=True)
        for lod in LODS:
            dest = dest_dir / f"{lod}.glb"
            if dest.exists() and __import__("os").environ.get("R6_RESUME") == "1":
                m = metrics(dest)
            else:
                base_path = BASE_PATHS[lod](asset_name)
                if not base_path.exists(): raise FileNotFoundError(base_path)
                base = trimesh.load(base_path, force="scene")
                detail = module.build(ctx, lod)
                if lod == "lod0":
                    editable = EDITABLE / f"{asset_name}-hero-source.glb"
                    editable.write_bytes(detail.export(file_type="glb"))
                combined = combine(base, detail, f"r6-{asset_name}-{lod}")
                raw_path = TMP / f"{asset_name}-{lod}.glb"
                raw_path.write_bytes(combined.export(file_type="glb"))
                shutil.copy2(raw_path, dest)
                m = metrics(dest)
            m["file"] = str(dest.relative_to(ROOT / "public"))
            m["textureEncoding"] = "PNG/raw-pending-KTX2"
            scene_item["lods"][lod] = m
            print(f"{asset_name:18s} {lod:5s}: {m['triangles']:7,d} tris | {m['meshGroups']:2d} groups | {m['bytes']/1048576:5.2f} MiB")
        manifest["scenes"].append(scene_item)
    (OUT / "manifest.raw.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    (OUT / "manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")

if __name__ == "__main__": main()
