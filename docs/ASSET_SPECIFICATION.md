# Asset Specification

## Blender manifest
`blender/manifests/vehicle_manifest.json` describes expected node names.

## Game manifest
`src/assets/CarManifest.js` maps car id -> { url, nodes }.

## Verified
- Real Blender 5.2.3 export loaded in game as car id `blender`.
- Wheel nodes (4) connected; steering node connected.
- Physics remains independent.