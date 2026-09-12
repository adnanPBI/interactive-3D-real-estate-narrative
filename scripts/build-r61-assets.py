#!/usr/bin/env python3
"""R6.1 production asset build.

Five not-yet-remediated heroes still use the proven R6 deterministic recipes.
Manufacturing Line is different: its checked-in visual-master GLB is the source
of truth, LOD0/1/2 are deterministically filtered from that master, runtime
static geometry is merged by material, and proxy is derived only from final LOD2.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MODEL_ROOT = ROOT / "public" / "models" / "r6" / "hero"
TEXTURE_ROOT = ROOT / "public" / "textures" / "r6"
FALLBACK_ROOT = ROOT / "public" / "fallback" / "r6"
SOURCE_ROOT = ROOT / "assets-source" / "r6"
MFG_SOURCE = SOURCE_ROOT / "heroes" / "manufacturing-line"


def load_legacy():
    spec = importlib.util.spec_from_file_location("r6_legacy_generator", ROOT / "scripts" / "generate-r6-assets.py")
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load R6 legacy generator")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def material_name(mesh: trimesh.Trimesh) -> str:
    return getattr(getattr(mesh, "visual", None), "material", None).name or "Panel_White"


def select_source_meshes(source: trimesh.Scene, runtime_lod: int):
    if runtime_lod not in (0, 1, 2):
        raise ValueError(runtime_lod)
    selected: list[tuple[str, trimesh.Trimesh]] = []
    for node in sorted(source.graph.nodes_geometry, key=str):
        matrix, geom_name = source.graph.get(node)
        prefix = str(node).split("__", 1)[0]
        if prefix not in {"L0", "L1", "L2"}:
            raise RuntimeError(f"Manufacturing source node lacks LOD prefix: {node}")
        authored_level = int(prefix[1])
        include = runtime_lod == 0 or (runtime_lod == 1 and authored_level >= 1) or (runtime_lod == 2 and authored_level == 2)
        if not include:
            continue
        mesh = source.geometry[geom_name].copy()
        mesh.apply_transform(np.asarray(matrix, dtype=np.float64))
        selected.append((str(node), mesh))
    return selected


def merge_runtime_by_material(selected: list[tuple[str, trimesh.Trimesh]], out: Path):
    groups: dict[str, list[trimesh.Trimesh]] = {}
    materials = {}
    for _node, mesh in selected:
        name = material_name(mesh)
        groups.setdefault(name, []).append(mesh)
        materials.setdefault(name, mesh.visual.material)
    runtime = trimesh.Scene()
    triangles = 0
    for name in sorted(groups):
        meshes = groups[name]
        uv_parts = []
        for mesh in meshes:
            uv = getattr(mesh.visual, "uv", None)
            if uv is None or len(uv) != len(mesh.vertices):
                raise RuntimeError(f"Manufacturing source {name} is missing authored TEXCOORD_0")
            uv_parts.append(np.asarray(uv, dtype=np.float64))
        merged = trimesh.util.concatenate(meshes)
        merged.visual = trimesh.visual.texture.TextureVisuals(
            uv=np.concatenate(uv_parts, axis=0),
            material=materials[name],
        )
        runtime.add_geometry(merged, node_name=f"Merged_{name}", geom_name=f"Merged_{name}")
        triangles += int(len(merged.faces))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(trimesh.exchange.gltf.export_glb(runtime, include_normals=True))
    return triangles, out.stat().st_size, len(groups), len(selected)


def build_manufacturing(gen, require_basis: bool):
    source_manifest_path = MFG_SOURCE / "source-manifest.json"
    master_path = MFG_SOURCE / "visual-master.glb"
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf8"))
    if not source_manifest.get("pipelineAuthoritative"):
        raise RuntimeError("Manufacturing source must be marked pipelineAuthoritative")
    actual_sha = sha256(master_path)
    if actual_sha != source_manifest.get("sourceSha256"):
        raise RuntimeError("Manufacturing visual-master SHA-256 differs from source-manifest; re-author deliberately and review")

    texture_cmd = ["python3", str(ROOT / "scripts" / "encode-r61-textures.py")]
    if require_basis:
        texture_cmd.append("--require-basis")
    subprocess.run(texture_cmd, cwd=ROOT, check=True)
    texture_manifest_path = TEXTURE_ROOT / "manufacturing-line" / "materials" / "encoding-manifest.json"
    texture_manifest = json.loads(texture_manifest_path.read_text(encoding="utf8"))
    if require_basis and not texture_manifest.get("releaseReadyBasis"):
        raise RuntimeError("Manufacturing material textures are not release-ready Basis KTX2")

    source_loaded = trimesh.load(master_path, force="scene", process=False)
    source = source_loaded if isinstance(source_loaded, trimesh.Scene) else trimesh.Scene(source_loaded)
    hero_dir = MODEL_ROOT / "manufacturing-line"
    hero_dir.mkdir(parents=True, exist_ok=True)
    lod_meta = {}
    for level, name in enumerate(("lod0", "lod1", "lod2")):
        selected = select_source_meshes(source, level)
        tris, bytes_, draws, components = merge_runtime_by_material(selected, hero_dir / f"{name}.glb")
        lod_meta[name] = {"triangles": tris, "bytes": bytes_, "components": components, "drawCalls": draws, "derivedFrom": "visual-master.glb"}
    if not (75000 <= lod_meta["lod0"]["triangles"] <= 95000):
        raise RuntimeError(f"Manufacturing LOD0 {lod_meta['lod0']['triangles']} outside 75k-95k fidelity band")
    if not (lod_meta["lod0"]["triangles"] > lod_meta["lod1"]["triangles"] > lod_meta["lod2"]["triangles"]):
        raise RuntimeError("Manufacturing source-derived LODs are not strictly descending")

    reduction = gen.derive_proxy_from_lod2(hero_dir / "lod2.glb", hero_dir / "proxy.glb")
    lod_meta["lod2"].update({"sha256": reduction["sourceSha256"], "bounds": reduction["sourceBounds"]})
    lod_meta["proxy"] = {
        "triangles": reduction["proxyTriangles"],
        "bytes": (hero_dir / "proxy.glb").stat().st_size,
        "components": reduction["keptGeometries"],
        "derivedFrom": "lod2",
        "derivation": reduction["algorithm"],
        "sourceSha256": reduction["sourceSha256"],
        "sha256": reduction["proxySha256"],
        "sourceBounds": reduction["sourceBounds"],
        "bounds": reduction["proxyBounds"],
        "boundsMaxAbsDelta": reduction["boundsMaxAbsDelta"],
    }
    return {
        "manualAuthored": True,
        "bevelGeometry": True,
        "authoringMode": "source-glb-visual-master",
        "sourceAsset": {
            "path": "assets-source/r6/heroes/manufacturing-line/visual-master.glb",
            "sha256": actual_sha,
            "status": source_manifest["status"],
            "pipelineAuthoritative": True,
            "clientApproved": bool(source_manifest.get("clientApproved")),
            "uvPolicy": source_manifest["uvPolicy"],
        },
        "lods": lod_meta,
        "textures": texture_manifest["records"],
        "basisReleaseReady": bool(texture_manifest["releaseReadyBasis"]),
        "fallback": "/fallback/r6/manufacturing-line.webp",
    }, reduction




def encode_legacy_basis(source_png: Path, target: Path, kind: str):
    toktx = os.environ.get("TOKTX") or shutil.which("toktx")
    if not toktx:
        raise RuntimeError("Release build requires Khronos toktx for all R6 runtime textures")
    target.parent.mkdir(parents=True, exist_ok=True)
    common = [toktx, "--t2", "--genmipmap", "--threads", "1", "--assign_primaries", "bt709"]
    if kind == "basecolor":
        args = common + ["--assign_oetf", "srgb", "--bcmp", "--clevel", "5", "--qlevel", "192"]
    else:
        args = common + ["--assign_oetf", "linear", "--uastc", "2", "--zcmp", "10"]
        if kind == "normal": args += ["--normal_mode"]
    result = subprocess.run(args + [str(target), str(source_png)], cwd=ROOT, text=True, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"toktx failed for {source_png}:\n{result.stdout}\n{result.stderr}")

def build_legacy_hero(gen, hero: str, builder, index: int, require_basis: bool):
    hero_dir = MODEL_ROOT / hero
    hero_dir.mkdir(parents=True, exist_ok=True)
    meta = {"manualAuthored": True, "bevelGeometry": True, "authoringMode": "r6-legacy-deterministic-recipe", "lods": {}, "textures": []}
    for level in range(3):
        authored = builder(level)
        name = ("lod0", "lod1", "lod2")[level]
        tris, bytes_ = gen.export_scene(authored, hero_dir / f"{name}.glb")
        meta["lods"][name] = {"triangles": tris, "bytes": bytes_, "components": len(authored.authored_components)}
    reduction = gen.derive_proxy_from_lod2(hero_dir / "lod2.glb", hero_dir / "proxy.glb")
    meta["lods"]["lod2"].update({"sha256": reduction["sourceSha256"], "bounds": reduction["sourceBounds"]})
    meta["lods"]["proxy"] = {
        "triangles": reduction["proxyTriangles"],
        "bytes": (hero_dir / "proxy.glb").stat().st_size,
        "components": reduction["keptGeometries"],
        "derivedFrom": "lod2",
        "derivation": reduction["algorithm"],
        "sourceSha256": reduction["sourceSha256"],
        "sha256": reduction["proxySha256"],
        "sourceBounds": reduction["sourceBounds"],
        "bounds": reduction["proxyBounds"],
        "boundsMaxAbsDelta": reduction["boundsMaxAbsDelta"],
    }
    texdir = TEXTURE_ROOT / hero
    texdir.mkdir(parents=True, exist_ok=True)
    base, normal, orm = gen.authored_texture(hero, index)
    for name, arr, srgb in (("basecolor", base, True), ("normal", normal, False), ("orm", orm, False)):
        source_png = SOURCE_ROOT / f"{hero}-{name}.png"
        Image.fromarray(arr, "RGBA").save(source_png)
        target = texdir / f"{name}.ktx2"
        if require_basis:
            encode_legacy_basis(source_png, target, name)
            fmt = "KTX2_BASIS_ETC1S" if name == "basecolor" else "KTX2_BASIS_UASTC"
        else:
            gen.write_ktx2(target, arr, srgb=srgb)
            fmt = "KTX2_RGBA8_DEV"
        meta["textures"].append({"path": f"/textures/r6/{hero}/{name}.ktx2", "bytes": target.stat().st_size, "format": fmt})
    meta["fallback"] = f"/fallback/r6/{hero}.webp"
    return meta, reduction


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-basis", action="store_true", help="hard-fail unless Manufacturing material maps are actual Basis Universal KTX2")
    args = parser.parse_args()
    gen = load_legacy()
    manifest = {
        "revision": "r6.1-manufacturing-fidelity",
        "runtimeFoundation": "R6 V2",
        "authoring": "Manufacturing consumes a checked-in visual-master GLB; five heroes remain on R6 recipes until sequential remediation",
        "bevelPolicy": "visible hard-surface shells use real geometry; Manufacturing source contains authored hard-surface detail",
        "texturePolicy": "Manufacturing uses material-specific 512px BaseColor/Normal/ORM source maps with offline mip chains; release gate requires Basis ETC1S/UASTC",
        "proxyPolicy": {
            "source": "LOD2",
            "algorithm": gen.PROXY_REDUCER,
            "targetRatio": gen.PROXY_TARGET_RATIO,
            "boundsConsistency": "proxy bounds must match final LOD2 within rtol=1e-6/atol=1e-5",
        },
        "remediationOrder": ["manufacturing-line", "integrated-campus", "data-center-cooling", "substation-bess", "recycling-intake", "connected-campus"],
        "heroes": {},
    }
    proxy_report = {"version": 2, "source": "final LOD2 GLB", "algorithm": gen.PROXY_REDUCER, "targetRatio": gen.PROXY_TARGET_RATIO, "chapters": []}

    # Manufacturing uses material-specific maps exclusively; remove stale hero-wide maps
    # from older R6 packages so release validation covers only runtime-reachable textures.
    for obsolete in ("basecolor.ktx2", "normal.ktx2", "orm.ktx2"):
        stale = TEXTURE_ROOT / "manufacturing-line" / obsolete
        if stale.exists(): stale.unlink()

    for index, (hero, builder) in enumerate(gen.BUILDERS.items()):
        if hero == "manufacturing-line":
            meta, reduction = build_manufacturing(gen, args.require_basis)
        else:
            meta, reduction = build_legacy_hero(gen, hero, builder, index, args.require_basis)
        gen.draw_fallback(hero, index, FALLBACK_ROOT / f"{hero}.webp")
        manifest["heroes"][hero] = meta
        proxy_report["chapters"].append({"hero": hero, **reduction})
        print(hero, {k: v["triangles"] for k, v in meta["lods"].items()})

    total_payload = sum(int(t.get("bytes", 0)) for hero in manifest["heroes"].values() for t in hero["textures"])
    # All source maps are RGBA8 before GPU transcode: Manufacturing = 24x512p2; five legacy heroes = 15x256p2. Include full-mip factor 4/3.
    decoded = int((24 * 512 * 512 * 4 + 15 * 256 * 256 * 4) * 4 / 3)
    manifest["imatePayloadBytes"] = total_payload
    manifest["estimatedDecodedTextureBytes"] = decoded
    manifest["basisReleaseReady"] = bool(manifest["heroes"]["manufacturing-line"].get("basisReleaseReady"))
    out_root = MODEL_ROOT.parent
    (out_root / "proxy-reduction.json").write_text(json.dumps(proxy_report, indent=2) + "\n", encoding="utf8")
    (out_root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    print(f"manifest: {out_root/'manifest.json'}; decoded textures={decoded/1048576:.2f} MiB; basisReleaseReady={manifest['basisReleaseReady']}")


if __name__ == "__main__":
    main()
