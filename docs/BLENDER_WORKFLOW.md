# Blender Workflow

## Detection
- Run `npm run blender:check` (uses `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` by default or `BLENDER_PATH`).
- Verified: Blender 5.2.3 LTS.

## Create test scene
- `npm run blender:create-test` runs `blender/scripts/create_test_vehicle.py` in background mode.
- Saves `blender/vehicles/test_vehicle.blend`.

## Validate
- `npm run blender:validate` runs `blender/scripts/validate_scene.py`.
- Verified: all required objects present, no scale warnings.

## Export
- `npm run blender:export` runs `blender/scripts/export_vehicle.py`.
- Exports `blender/exports/test_vehicle.glb` and copies to `public/models/blender_vehicle.glb`.
- Verified: export succeeded, size 53232 bytes.

## Live sync
- `npm run blender:watch` watches export file and updates version JSON.
- Game polls version in dev mode and reloads model.

## Supported object names
Body, Wheel_FL/FR/RL/RR, SteeringWheel, Glass, Headlight_L/R, Taillight_L/R.