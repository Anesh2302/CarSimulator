import { execFileSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
const blenderPath = process.env.BLENDER_PATH || 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const blendFile = 'blender/vehicles/test_vehicle.blend';
const scriptPath = 'blender/scripts/export_vehicle.py';
const outPath = 'blender/exports/test_vehicle.glb';
if (!existsSync(blendFile)) { console.error('BLEND_NOT_FOUND'); process.exit(1); }
try {
  const out = execFileSync(blenderPath, [blendFile, '--background', '--python', scriptPath, '--', outPath], { encoding: 'utf8', stdio: 'pipe' });
  console.log(out);
  copyFileSync(outPath, 'public/models/blender_vehicle.glb');
  console.log('COPIED_TO_PUBLIC: public/models/blender_vehicle.glb');
  console.log('EXPORT_DONE');
} catch (e) {
  console.error('EXPORT_FAILED');
  console.error(e.stdout || '');
  console.error(e.stderr || e.message);
  process.exit(1);
}
