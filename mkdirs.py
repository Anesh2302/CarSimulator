import os
base = r"D:\simonpeter\CarSimulator\blender"
for d in ["scripts","vehicles","environments","exports","manifests"]:
    os.makedirs(os.path.join(base,d), exist_ok=True)
print("done")