import bpy
import os
import sys

# Clean default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Materials
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

red = mat("BodyRed", (0.85,0.15,0.12), metallic=0.7, roughness=0.3)
black = mat("Black", (0.05,0.05,0.05), roughness=0.6)
glass = mat("Glass", (0.7,0.85,1.0), roughness=0.05, alpha=0.25)
light = mat("Light", (1.0,0.95,0.8), emit=3.0)
tail = mat("Tail", (1.0,0.1,0.1), emit=2.0)
interior = mat("Interior", (0.12,0.12,0.14), roughness=0.8)

def add_box(name, size, loc, mat=None, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    if mat: o.data.materials.append(mat)
    if parent: o.parent = parent
    return o

def add_cyl(name, radius, depth, loc, rot=(0,0,0), mat=None, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    if mat: o.data.materials.append(mat)
    if parent: o.parent = parent
    return o

# Body
body = add_box("Body", (2.0,4.2,0.7), (0,0,0.6), red)
chassis = add_box("Chassis", (1.8,4.0,0.2), (0,0,0.25), black, parent=body)

# Wheels with pivot empties
wheel_defs = [
    ("Wheel_FL", (-1.05, 1.3, 0.35)),
    ("Wheel_FR", (1.05, 1.3, 0.35)),
    ("Wheel_RL", (-1.05, -1.3, 0.35)),
    ("Wheel_RR", (1.05, -1.3, 0.35)),
]
for name, loc in wheel_defs:
    pivot = bpy.data.objects.new(name+"_Pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = loc
    pivot.parent = body
    w = add_cyl(name, 0.35, 0.3, loc, rot=(1.5708,0,0), mat=black, parent=pivot)

# Steering wheel
sw_pivot = bpy.data.objects.new("SteeringWheel_Pivot", None)
bpy.context.collection.objects.link(sw_pivot)
sw_pivot.location = (0,0.6,1.05)
sw_pivot.rotation_euler = (1.5708,0,0)
sw_pivot.parent = body
sw = add_cyl("SteeringWheel", 0.25, 0.04, (0,0.6,1.05), rot=(1.5708,0,0), mat=black, parent=sw_pivot)

# Glass
glass = add_box("Glass", (1.6,2.0,0.6), (0,-0.2,1.15), glass, parent=body)

# Interior
dash = add_box("Dashboard", (1.5,0.3,0.4), (0,0.6,0.9), interior, parent=body)
seat_l = add_box("Seat_L", (0.6,0.6,0.5), (-0.5,-0.4,0.7), interior, parent=body)
seat_r = add_box("Seat_R", (0.6,0.6,0.5), (0.5,-0.4,0.7), interior, parent=body)

# Lights
hl_l = add_box("Headlight_L", (0.3,0.1,0.15), (-0.7,2.05,0.7), light, parent=body)
hl_r = add_box("Headlight_R", (0.3,0.1,0.15), (0.7,2.05,0.7), light, parent=body)
tl_l = add_box("Taillight_L", (0.3,0.1,0.15), (-0.7,-2.05,0.7), tail, parent=body)
tl_r = add_box("Taillight_R", (0.3,0.1,0.15), (0.7,-2.05,0.7), tail, parent=body)

# Camera
cam_data = bpy.data.cameras.new("Camera")
cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
cam_obj.location = (0,-6,2)
cam_obj.rotation_euler = (1.3,0,0)
cam_obj.parent = body

# Apply scale to meshes (so export scale correct)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        o.select_set(True)
bpy.context.view_layer.objects.active = [o for o in bpy.context.scene.objects if o.type=='MESH'][0]
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.object.select_all(action='DESELECT')

# Save blend
out_blend = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vehicles", "test_vehicle.blend")
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
print("SAVED_BLEND:", out_blend)
print("SCENE_CREATED_OK")
