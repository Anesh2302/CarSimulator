import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const defaultPath = process.env.BLENDER_PATH || 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const blenderPath = process.argv[2] || defaultPath;

if (!existsSync(blenderPath)) {
  console.error('BLENDER_NOT_FOUND:', blenderPath);
  process.exit(1);
}
try {
  const out = execFileSync(blenderPath, ['--version'], { encoding: 'utf8' });
  const first = out.split(/\r?\n/)[0];
  console.log('BLENDER_FOUND:', blenderPath);
  console.log('BLENDER_VERSION:', first.trim());
} catch (e) {
  console.error('BLENDER_CHECK_FAILED:', e.message);
  process.exit(1);
}
