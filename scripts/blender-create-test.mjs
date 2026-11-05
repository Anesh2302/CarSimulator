import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const blenderPath = process.env.BLENDER_PATH || 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const scriptPath = 'blender/scripts/create_test_vehicle.py';
if (!existsSync(blenderPath)) { console.error('BLENDER_NOT_FOUND'); process.exit(1); }
try {
  const out = execFileSync(blenderPath, ['--background', '--python', scriptPath], { encoding: 'utf8', stdio: 'pipe' });
  console.log(out);
  console.log('CREATE_TEST_DONE');
} catch (e) {
  console.error('CREATE_TEST_FAILED');
  console.error(e.stdout || '');
  console.error(e.stderr || e.message);
  process.exit(1);
}
