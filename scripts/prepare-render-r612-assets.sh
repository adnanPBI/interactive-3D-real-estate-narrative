#!/usr/bin/env bash
set -euo pipefail

if [[ "${RENDER:-}" != "true" && -z "${RENDER_SERVICE_ID:-}" ]]; then
  echo "R6 Render asset bootstrap: non-Render build, skipping."
  exit 0
fi

asset_set="$(printf '%s' "${NEXT_PUBLIC_3D_ASSET_SET:-r6}" | tr '[:upper:]' '[:lower:]')"
if [[ "$asset_set" != "r6" ]]; then
  echo "R6 Render asset bootstrap: NEXT_PUBLIC_3D_ASSET_SET=$asset_set; skipping."
  exit 0
fi

echo "R6 Render asset bootstrap: preparing R6.1.6 cinematic runtime assets."
python3 --version
python3 -m pip install --disable-pip-version-check trimesh==4.11.1 numpy==2.3.5 scipy==1.16.2 Pillow==12.3.0

# Keep inherited context free of roads, vehicles and duplicate static turbines.
python3 scripts/generate-r615-clean-context.py

payload="/tmp/author-r61.py.gz.b64"
awk '/^H4sI/{capture=1} capture && /^B64$/{exit} capture{print}' .github/workflows/materialize-r612-source.yml > "$payload"
test -s "$payload"
base64 -d "$payload" | gunzip > scripts/author-r61-manufacturing-source.py

rm -rf assets-source/r6/heroes/manufacturing-line public/models/r6/hero public/textures/r6
python3 scripts/author-r61-manufacturing-source.py

# Retain exact source SHA as the primary identity. Only sub-picometre normal
# roundoff and cylinder-height metadata noise have a canonical fingerprint.
# Position, topology, UV and material data are never rounded or substituted.
python3 scripts/r61_source_identity.py \
  assets-source/r6/heroes/manufacturing-line/visual-master.glb \
  --report artifacts/cinematic/source-identity.json

npm run validate:r61:source
python3 scripts/run-r61-render-build.py
npm run prove:r6:cpu-fallback
python3 scripts/validate-r61-render-runtime.py

echo "R6 Render asset bootstrap complete."
