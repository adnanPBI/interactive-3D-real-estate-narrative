#!/usr/bin/env python3
"""Verify manufacturing source identity without rewriting the visual master.

CPython/BLAS builds emitted the same vertices, indices, UVs and materials but
changed near-zero NORMAL scalars by <1e-15 and three cylinder-height extras by
<2e-16. This fingerprint tolerates only those serialization differences.
Everything else, including all position/UV/index bytes, remains hash-covered.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import struct
import numpy as np

RAW_SHA256 = '896f4a4c4d1fca72d36b6e76f5c44d74d1b59338f4b5374a25295665af1b4d8e'
IDENTITY_SHA256 = '72edbe09a79bbc3c874e3ac1e877dc04a0ca976893b462bc32ffc210a177d6f4'


def identity_digest(data: bytes) -> str:
    magic, version, length = struct.unpack_from('<III', data, 0)
    if magic != 0x46546C67 or version != 2 or length != len(data):
        raise ValueError('Invalid GLB header')
    json_length, json_type = struct.unpack_from('<II', data, 12)
    if json_type != 0x4E4F534A:
        raise ValueError('Expected JSON chunk')
    tree = json.loads(data[20:20+json_length])
    bin_length, bin_type = struct.unpack_from('<II', data, 20+json_length)
    if bin_type != 0x004E4942 or 28+json_length+bin_length != length:
        raise ValueError('Expected a single complete BIN chunk')
    binary = bytearray(data[28+json_length:])
    normals = {p['attributes']['NORMAL'] for m in tree['meshes']
               for p in m['primitives'] if 'NORMAL' in p['attributes']}
    for index in normals:
        accessor = tree['accessors'][index]
        view = tree['bufferViews'][accessor['bufferView']]
        if accessor['componentType'] != 5126 or accessor['type'] != 'VEC3' or view.get('byteStride',12) != 12:
            raise ValueError('Unexpected source normal encoding')
        offset = view.get('byteOffset',0) + accessor.get('byteOffset',0)
        values = np.frombuffer(binary, dtype='<f4', count=accessor['count']*3, offset=offset)
        if not np.isfinite(values).all():
            raise ValueError('Non-finite normals')
        values[np.abs(values) < 1e-12] = 0.0
    for mesh in tree['meshes']:
        extras = mesh.get('extras',{})
        if isinstance(extras.get('height'),float):
            extras['height'] = round(extras['height'],12)
    metadata = json.dumps(tree,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf8')
    return hashlib.sha256(metadata+b'\0'+binary).hexdigest()


def verify(data: bytes) -> dict:
    raw = hashlib.sha256(data).hexdigest()
    if raw == RAW_SHA256:
        return {'mode':'exact-source-sha256','sha256':raw,'sourceUnmodified':True}
    digest = identity_digest(data)
    if digest != IDENTITY_SHA256:
        raise ValueError(f'Manufacturing source identity mismatch: raw={raw} identity={digest}')
    return {'mode':'normal-zero-and-metadata-canonical-identity','sha256':raw,
            'identitySha256':digest,'referenceSha256':RAW_SHA256,'sourceUnmodified':True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('master',type=Path)
    parser.add_argument('--report',type=Path)
    args = parser.parse_args()
    result = verify(args.master.read_bytes())
    payload = json.dumps(result,indent=2)+'\n'
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(payload)
    print(payload,end='')

if __name__ == '__main__':
    main()
