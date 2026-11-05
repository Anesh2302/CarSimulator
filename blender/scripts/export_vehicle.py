import bpy
import sys
import os
import json

# Parse args after '--'
args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
out_path = args[0] if len(args) > 0 else os.path.join(os.path.dirname(__file__), "..", "exports", "test_vehicle.glb")
manifest_path = args[1] if len(args) > 1 else None

# Validate required objects
names = [o.name for o in bpy.context.scene.objects]
required = ["Body","Wheel_FL","Wheel_FR","Wheel_RL","Wheel_RR","SteeringWheel","Glass","Headlight_L","Headlight_R","Taillight_L","Taillight_R"]
missing = [r for r in required if r not in names]
if missing:
    print("EXPORT_FAILED: missing objects:", missing)
    sys.exit(1)

# Ensure output dir
os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

# Export
try:
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(out_path),
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_animations=False,
    )
except Exception as e:
    print("EXPORT_FAILED:", str(e))
    sys.exit(1)

print("EXPORT_OK:", os.path.abspath(out_path))
print("EXPORT_SIZE:", os.path.getsize(os.path.abspath(out_path)))
