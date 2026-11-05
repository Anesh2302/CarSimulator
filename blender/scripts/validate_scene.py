import bpy
import json
import sys
import os

required = {
    "body": ["Body"],
    "wheels": ["Wheel_FL","Wheel_FR","Wheel_RL","Wheel_RR"],
    "steering": ["SteeringWheel"],
    "glass": ["Glass"],
    "lights": ["Headlight_L","Headlight_R","Taillight_L","Taillight_R"],
}

manifest_path = None
for arg in sys.argv:
    if arg.endswith(".json"):
        manifest_path = arg

if manifest_path and os.path.exists(manifest_path):
    import os, json
    with open(manifest_path) as f:
        manifest = json.load(f)
else:
    manifest = None

names = [o.name for o in bpy.context.scene.objects]
report = {"objects": names, "missing": [], "ok": True}

# Check required groups
for group, reqs in required.items():
    for r in reqs:
        if r not in names:
            report["missing"].append(r)
            report["ok"] = False

# scale check
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        sx,sy,sz = o.scale
        if any(abs(s-1.0) > 0.001 for s in (sx,sy,sz)):
            report.setdefault("scale_warnings", []).append(o.name)

print("VALIDATION_REPORT:", json.dumps(report))
if not report["ok"]:
    sys.exit(1)
print("VALIDATION_OK")
