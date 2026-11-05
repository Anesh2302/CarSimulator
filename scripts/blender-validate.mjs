import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const blenderPath = process.env.BLENDER_PATH || 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const blendFile = 'blender/vehicles/test_vehicle.blend';
const scriptPath = 'blender/scripts/validate_scene.py';
const manifest = 'blender/manifests/vehicle_manifest.json';
if (!existsSync(blendFile)) { console.error('BLEND_NOT_FOUND'); process.exit(1); }
try {
  const out = execFileSync(blenderPath, [blendFile, '--background', '--python', scriptPath, '--', manifest], { encoding: 'utf8', stdio: 'pipe' });
  console.log(out);
  console.log('VALIDATE_DONE');
} catch (e) {
  console.error('VALIDATE_FAILED');
  console.error(e.stdout || '');
  console.error(e.stderr || e.message);
  process.exit(1);
}
