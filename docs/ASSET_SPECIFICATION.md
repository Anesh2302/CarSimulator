# Asset Specification

## Vehicle manifest
`src/assets/CarManifest.js` maps car id -> { url, nodes }.

## Node requirements
- body: main body mesh
- wheels: FL, FR, RL, RR
- steeringWheel: steering wheel mesh
- glass: transparent glass mesh
- headlights/brakelights/indicators: optional emissive meshes

## Environment
- GLB or procedural. Use instancing for repeated props.

## Textures
- Base color, normal, roughness, metallic. Power-of-two. Max 2048 for hero assets, 512 for props.