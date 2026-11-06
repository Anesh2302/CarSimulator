import os
for d in ['public/assets/models','public/assets/audio','public/assets/textures','public/assets/hdri']:
    os.makedirs(d, exist_ok=True)
print('done')