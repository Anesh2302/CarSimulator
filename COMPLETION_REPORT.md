# Realism Audit Report

| Feature | Actual Implementation | Evidence | Test Result | Status |
|---|---|---|---|---|
| Five distinct vehicles | 5 GLBs from Blender with different geometry/colors | Files in public/models | Loaded in game | PARTIAL |
| Recorded engine audio | None; procedural Web Audio synthesis | AudioManager.js | Audio plays | FAIL (no recordings) |
| Wheel-level physics | Scalar speed + per-wheel slip/suspension visuals | Car.js | Driving works | PARTIAL |
| Suspension movement | Visual wheel offsets from load transfer | updateVisuals | Observed | PARTIAL |
| Tire slip | Computed from steering*speed | car.slip | Audio uses it | PARTIAL |
| Realistic environment | Procedural box city | World.js | Renders | PARTIAL |
| PBR materials | Blender Principled BSDF exported | GLB | Renders in Three.js | PASS |
| Performance | No profiling numbers | Build only | Build passes | UNVERIFIED |

## Remaining limitations
- No licensed audio recordings.
- Models are procedural mid-detail, not hero assets.
- Physics is arcade-hybrid, not full rigid-body.
- No LOD/instancing benchmarks.