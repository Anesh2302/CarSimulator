import bpy
import os
import sys

args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
name = args[0] if len(args) > 0 else "test_vehicle"
color = tuple(float(x) for x in args[1:4]) if len(args) >= 4 else (0.85,0.15,0.12)
out_blend = args[4] if len(args) > 4 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vehicles", name + ".blend")

bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, metallic=0.0, roughness=0.5, alpha=1.0, emit=0.0):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if alpha < 1.0:
        m.blend_method = 'BLEND'
        bsdf.inputs["Alpha"].default_value = alpha
    if emit > 0:
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit
    return m

body_mat = mat("BodyMat", color, metallic=0.7, roughness=0.28)
black = mat("Black", (0.05,0.05,0.05), roughness=0.6)
glass = mat("Glass", (0.7,0.85,1.0), roughness=0.05, alpha=0.22)
light = mat("Light", (1.0,0.95,0.8), emit=4.0)
tail = mat("Tail", (1.0,0.1,0.1), emit=3.0)
interior = mat("Interior", (0.12,0.12,0.14), roughness=0.8)
chrome = mat("Chrome", (0.9,0.9,0.92), metallic=1.0, roughness=0.15)
rubber = mat("Rubber", (0.03,0.03,0.03), roughness=0.9)

def bevel(obj, width=0.03, segs=2):
    mod = obj.modifiers.new(name="Bevel", type='BEVEL')
    mod.width = width
    mod.segments = segs
    mod.limit_method = 'ANGLE'

def add_box(name, size, loc, mat=None, parent=None, bevelw=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    if mat: o.data.materials.append(mat)
    if bevelw > 0: bevel(o, bevelw)
    if parent: o.parent = parent
    return o

def add_cyl(name, radius, depth, loc, rot=(0,0,0), mat=None, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    if mat: o.data.materials.append(mat)
    if parent: o.parent = parent
    return o

# Body assembly
body = add_box("Body", (2.0,4.2,0.7), (0,0,0.6), body_mat, bevelw=0.06)
chassis = add_box("Chassis", (1.9,4.0,0.18), (0,0,0.22), black, parent=body)
hood = add_box("Hood", (1.9,1.3,0.12), (0,1.35,1.0), body_mat, parent=body, bevelw=0.04)
trunk = add_box("Trunk", (1.9,1.2,0.12), (0,-1.4,1.0), body_mat, parent=body, bevelw=0.04)
roof = add_box("Roof", (1.7,2.2,0.12), (0,0,1.35), body_mat, parent=body, bevelw=0.04)
bumper_f = add_box("Bumper_F", (2.0,0.25,0.35), (0,2.05,0.45), body_mat, parent=body, bevelw=0.05)
bumper_r = add_box("Bumper_R", (2.0,0.25,0.35), (0,-2.05,0.45), body_mat, parent=body, bevelw=0.05)
skirt_l = add_box("Skirt_L", (0.12,3.6,0.2), (-1.0,0,0.35), body_mat, parent=body)
skirt_r = add_box("Skirt_R", (0.12,3.6,0.2), (1.0,0,0.35), body_mat, parent=body)

# Glass
ws = add_box("Glass", (1.6,1.0,0.55), (0,0.95,1.18), glass, parent=body)
rear_glass = add_box("RearGlass", (1.6,0.8,0.5), (0,-1.05,1.18), glass, parent=body)
side_gl = add_box("SideGlass_L", (0.05,2.0,0.45), (-0.95,0,1.05), glass, parent=body)
side_gr = add_box("SideGlass_R", (0.05,2.0,0.45), (0.95,0,1.05), glass, parent=body)

# Wheels with pivots and rims
wheel_defs = [
    ("Wheel_FL", (-1.05, 1.3, 0.35)),
    ("Wheel_FR", (1.05, 1.3, 0.35)),
    ("Wheel_RL", (-1.05, -1.3, 0.35)),
    ("Wheel_RR", (1.05, -1.3, 0.35)),
]
for wname, loc in wheel_defs:
    pivot = bpy.data.objects.new(wname+"_Pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = loc
    pivot.parent = body
    tire = add_cyl(wname, 0.35, 0.28, loc, rot=(1.5708,0,0), mat=rubber, parent=pivot)
    rim = add_cyl(wname+"_Rim", 0.22, 0.29, loc, rot=(1.5708,0,0), mat=chrome, parent=pivot)
    disc = add_cyl(wname+"_Disc", 0.2, 0.02, loc, rot=(1.5708,0,0), mat=chrome, parent=pivot)

# Steering wheel
sw_pivot = bpy.data.objects.new("SteeringWheel_Pivot", None)
bpy.context.collection.objects.link(sw_pivot)
sw_pivot.location = (0,0.55,1.02)
sw_pivot.rotation_euler = (1.5708,0,0)
sw_pivot.parent = body
sw = add_cyl("SteeringWheel", 0.24, 0.04, (0,0.55,1.02), rot=(1.5708,0,0), mat=black, parent=sw_pivot)

# Interior
dash = add_box("Dashboard", (1.6,0.25,0.35), (0,0.7,0.92), interior, parent=body)
seat_l = add_box("Seat_L", (0.62,0.6,0.5), (-0.45,-0.35,0.68), interior, parent=body)
seat_r = add_box("Seat_R", (0.62,0.6,0.5), (0.45,-0.35,0.68), interior, parent=body)
console = add_box("Console", (0.3,1.2,0.25), (0,-0.4,0.62), interior, parent=body)
gear = add_cyl("GearSelector", 0.04, 0.18, (0.15,-0.1,0.78), mat=chrome, parent=body)

# Lights
hl_l = add_box("Headlight_L", (0.32,0.12,0.16), (-0.72,2.08,0.72), light, parent=body)
hl_r = add_box("Headlight_R", (0.32,0.12,0.16), (0.72,2.08,0.72), light, parent=body)
tl_l = add_box("Taillight_L", (0.32,0.12,0.16), (-0.72,-2.08,0.72), tail, parent=body)
tl_r = add_box("Taillight_R", (0.32,0.12,0.16), (0.72,-2.08,0.72), tail, parent=body)
# turn signals
sig_fl = add_box("Signal_FL", (0.12,0.08,0.1), (-0.95,2.08,0.72), mat("Signal", (1.0,0.6,0.0), emit=2.0), parent=body)
sig_fr = add_box("Signal_FR", (0.12,0.08,0.1), (0.95,2.08,0.72), mat("Signal", (1.0,0.6,0.0), emit=2.0), parent=body)

# Mirrors
mir_l = add_box("Mirror_L", (0.18,0.12,0.1), (-1.15,0.9,1.05), chrome, parent=body)
mir_r = add_box("Mirror_R", (0.18,0.12,0.1), (1.15,0.9,1.05), chrome, parent=body)

# Exhaust
ex_l = add_cyl("Exhaust_L", 0.06, 0.3, (-0.5,-2.15,0.3), rot=(1.5708,0,0), mat=chrome, parent=body)
ex_r = add_cyl("Exhaust_R", 0.06, 0.3, (0.5,-2.15,0.3), rot=(1.5708,0,0), mat=chrome, parent=body)

# Grille
grille = add_box("Grille", (1.4,0.08,0.3), (0,2.1,0.6), black, parent=body)

# Camera
cam_data = bpy.data.cameras.new("Camera")
cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
cam_obj.location = (0,-6,2.2)
cam_obj.rotation_euler = (1.3,0,0)
cam_obj.parent = body

# Apply scale
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        o.select_set(True)
meshes = [o for o in bpy.context.scene.objects if o.type=='MESH']
if meshes:
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.object.select_all(action='DESELECT')

os.makedirs(os.path.dirname(out_blend), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
print("SAVED_BLEND:", out_blend)
print("SCENE_CREATED_OK")
