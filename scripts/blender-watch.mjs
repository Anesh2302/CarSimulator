import fs from 'node:fs';
import path from 'node:path';

const src = 'blender/exports/test_vehicle.glb';
const dst = 'public/models/blender_vehicle.glb';
const versionFile = 'public/models/blender_vehicle.version.json';

function stableCopy() {
  try {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.size < 1000) { console.log('WAIT: file too small'); return; }
    // read to ensure not locked
    const buf = fs.readFileSync(src);
    fs.writeFileSync(dst, buf);
    const version = { version: Date.now(), size: buf.length };
    fs.writeFileSync(versionFile, JSON.stringify(version));
    console.log('RELOADED_MODEL:', new Date().toISOString(), 'size', buf.length);
  } catch (e) {
    console.error('RELOAD_FAILED:', e.message);
  }
}

console.log('Watching', src);
let timer = null;
fs.watchFile(src, { interval: 1000 }, (curr, prev) => {
  if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(stableCopy, 800);
  }
});
// initial
stableCopy();
// keep alive
setInterval(() => {}, 100000);
