import struct, json, os

# Helper: box geometry (w,h,d) -> positions (8 verts) + indices (36)
def box(w,h,d):
    hx,hy,hz = w/2,h/2,d/2
    verts = [
        (-hx,-hy,-hz), (hx,-hy,-hz), (hx,hy,-hz), (-hx,hy,-hz),
        (-hx,-hy,hz), (hx,-hy,hz), (hx,hy,hz), (-hx,hy,hz),
    ]
    # triangles
    idx = [
        0,1,2, 0,2,3, # back
        4,6,5, 4,7,6, # front
        0,4,5, 0,5,1, # bottom
        2,6,7, 2,7,3, # top
        0,3,7, 0,7,4, # left
        1,5,6, 1,6,2, # right
    ]
    return verts, idx

parts = []
# body
parts.append(('Body', box(2.0,0.7,4.2), (0,0.6,0)))
# wheels
wheel_positions = [(-1.05,0.35,1.3),(1.05,0.35,1.3),(-1.05,0.35,-1.3),(1.05,0.35,-1.3)]
for i,p in enumerate(wheel_positions):
    parts.append((f'Wheel_{["FL","FR","RL","RR"][i]}', box(0.7,0.7,0.3), p))
# steering wheel
parts.append(('SteeringWheel', box(0.5,0.06,0.5), (0,1.05,0.6)))
# glass
parts.append(('Glass', box(1.6,0.6,2.0), (0,1.15,-0.2)))

# Build buffer: positions then indices for each part
pos_data = bytearray()
idx_data = bytearray()
mesh_defs = []
node_defs = []
accessors = []
bufferViews = []
# We'll append positions for each mesh, then indices
# Track offsets
pos_offset = 0
# First pass positions
pos_chunks = []
idx_chunks = []
for name, (verts, idx), trans in parts:
    # positions bytes
    pbytes = b''
    xs=[v[0] for v in verts]; ys=[v[1] for v in verts]; zs=[v[2] for v in verts]
    for v in verts:
        pbytes += struct.pack('<fff', *v)
    pos_chunks.append((name, pbytes, verts))
    # indices
    ibytes = b''
    for i in idx:
        ibytes += struct.pack('<H', i)
    idx_chunks.append(ibytes)

# Concatenate positions
pos_blob = b''
pos_offsets = []
for name, pbytes, verts in pos_chunks:
    # align to 4
    while len(pos_blob) % 4: pos_blob += b'\x00'
    pos_offsets.append(len(pos_blob))
    pos_blob += pbytes
idx_blob = b''
idx_offsets = []
for ibytes in idx_chunks:
    while len(idx_blob) % 4: idx_blob += b'\x00'  # align? indices can be 2-byte but bufferView byteOffset can be any; align to 4 for safety
    idx_offsets.append(len(idx_blob))
    idx_blob += ibytes

# total buffer: positions then indices
# align pos_blob end to 4
while len(pos_blob) % 4: pos_blob += b'\x00'
idx_base = len(pos_blob)
# align idx_blob start? already
buffer = pos_blob + idx_blob
# fix idx offsets to include base
idx_offsets = [io + idx_base for io in idx_offsets]

# Build bufferViews/accessors/meshes
# positions bufferView index for each mesh, indices bufferView
meshes = []
for i,(name,(verts,idx),trans) in enumerate(parts):
    # position bufferView
    pv_index = len(bufferViews)
    bufferViews.append({"buffer":0,"byteOffset":pos_offsets[i],"byteLength":len(pos_chunks[i][1]),"target":34962})
    iv_index = len(bufferViews)
    bufferViews.append({"buffer":0,"byteOffset":idx_offsets[i],"byteLength":len(idx_chunks[i]),"target":34963})
    # accessors
    pa_index = len(accessors)
    xs=[v[0] for v in verts]; ys=[v[1] for v in verts]; zs=[v[2] for v in verts]
    accessors.append({"bufferView":pv_index,"componentType":5126,"count":len(verts),"type":"VEC3",
        "min":[min(xs),min(ys),min(zs)],"max":[max(xs),max(ys),max(zs)]})
    ia_index = len(accessors)
    accessors.append({"bufferView":iv_index,"componentType":5123,"count":len(idx),"type":"SCALAR"})
    meshes.append({"name":name,"primitives":[{"attributes":{"POSITION":pa_index},"indices":ia_index,
        "material":0}]})

# nodes: one per mesh
nodes = []
for i,m in enumerate(meshes):
    trans = parts[i][2]
    nodes.append({"name":parts[i][0],"mesh":i,"translation":list(trans)})

# materials
materials = [{"name":"CarMaterial","pbrMetallicRoughness":{"baseColorFactor":[0.9,0.2,0.2,1.0],"metallicFactor":0.6,"roughnessFactor":0.3}}]

gltf = {
  "asset":{"version":"2.0","generator":"CarSimulator placeholder"},
  "scene":0,
  "scenes":[{"nodes":list(range(len(nodes)))}],
  "nodes":nodes,
  "meshes":meshes,
  "materials":materials,
  "accessors":accessors,
  "bufferViews":bufferViews,
  "buffers":[{"byteLength":len(buffer)}]
}

# Write GLB
json_str = json.dumps(gltf,separators=(',',':'))
json_bytes = json_str.encode('utf-8')
# pad json to 4-byte
while len(json_bytes) % 4: json_bytes += b' '
bin_bytes = buffer
while len(bin_bytes) % 4: bin_bytes += b'\x00'

total = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
# header
out = struct.pack('<III', 0x46546C67, 2, total)  # magic glTF
# json chunk
out += struct.pack('<II', len(json_bytes), 0x4E4F534A)
out += json_bytes
# bin chunk
out += struct.pack('<II', len(bin_bytes), 0x004E4942)
out += bin_bytes

os.makedirs('public/models', exist_ok=True)
with open('public/models/car_placeholder.glb','wb') as f:
    f.write(out)
print('written', len(out))
