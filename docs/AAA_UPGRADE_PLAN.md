# AAA Upgrade Plan

## Phase 0: Audit
- Existing Three.js + Vite app with arcade physics.
- GLTF pipeline verified.
- Audio synthesized.

## Phase 1: Physics foundation
- Remove no-op steering factor.
- Implement fixed timestep accumulator.
- Add suspension, tire grip, slip, weight transfer, traction/ABS.
- Vehicle-specific configs.
- Improved collision AABB.

## Phase 2: Vehicles
- Five detailed Blender models (done basic). Refine materials/UVs.

## Phase 3: Audio
- Layered engine, tire slip, collision, ambient.

## Phase 4: Graphics
- PBR materials, lighting, weather.

## Phase 5: Optimization
- LOD/instancing where safe.

## Phase 6: QA
- Browser tests, build, docs.