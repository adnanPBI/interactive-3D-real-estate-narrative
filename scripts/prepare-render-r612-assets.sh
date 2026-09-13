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

echo "R6 Render asset bootstrap: preparing authoritative R6.1.2 runtime assets."
python3 --version
python3 -m pip install --disable-pip-version-check trimesh==4.11.1 numpy==2.3.5 Pillow==12.3.0

payload="/tmp/author-r61.py.gz.b64"
awk '/^H4sI/{capture=1} capture && /^B64$/{exit} capture{print}' .github/workflows/materialize-r612-source.yml > "$payload"
test -s "$payload"
base64 -d "$payload" | gunzip > scripts/author-r61-manufacturing-source.py

rm -rf assets-source/r6/heroes/manufacturing-line
python3 scripts/author-r61-manufacturing-source.py

expected_sha="896f4a4c4d1fca72d36b6e76f5c44d74d1b59338f4b5374a25295665af1b4d8e"
actual_sha="$(sha256sum assets-source/r6/heroes/manufacturing-line/visual-master.glb | awk '{print $1}')"
echo "Manufacturing visual-master SHA256=$actual_sha"
if [[ "$actual_sha" != "$expected_sha" ]]; then
  echo "R6 Render asset bootstrap failed: manufacturing visual-master SHA mismatch." >&2
  exit 21
fi

npm run validate:r61:source
npm run assets:r6
npm run validate:corporate:r6
npm run validate:r6:proxy
npm run prove:r6:cpu-fallback

echo "R6 Render asset bootstrap complete."
