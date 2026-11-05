# Blender Workflow

## Export settings
- Format: glTF 2.0 (.glb)
- Apply modifiers: yes
- Include: selected objects or whole scene
- Transform: +Y up
- Geometry: UVs, normals, tangents
- Materials: PBR (Principled BSDF)
- Textures: PNG/JPEG, power-of-two
- Animation: include if needed
- Compression: Draco optional (requires DRACOLoader)

## Naming
Use configurable names in `src/assets/CarManifest.js`. Example names: Body, Wheel_FL, Wheel_FR, Wheel_RL, Wheel_RR, SteeringWheel, Glass.

## Pipeline
1. Model in Blender.
2. Assign PBR materials and textures.
3. Name objects.
4. Export as .glb to `public/models/`.
5. Add entry to `src/assets/CarManifest.js`.
6. Test load in game.

## Notes
- Keep mesh pivots at wheel centers.
- Separate materials for glass (transparent).
- Use LODs by suffix `_LOD0`, `_LOD1` if desired.