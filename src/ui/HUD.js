export class HUD {
  constructor(game) { this.game = game; this.rpmCanvas = document.getElementById('rpmcanvas'); this.rpmCtx = this.rpmCanvas.getContext('2d'); this.miniCanvas = document.getElementById('minimap'); this.miniCtx = this.miniCanvas.getContext('2d'); this.flashTimer = 0; }
  update(dt, car, game) {
    document.getElementById('speed').textContent = Math.round(Math.abs(car.speed) * 3.6);
    const gearLabel = car.gear === 0 ? 'R' : (car.speed === 0 && car.gear === 1 ? 'N' : car.gear);
    // show N when stopped
    let g = car.gear;
    if (Math.abs(car.speed) < 0.2) g = 'N';
    else if (car.gear === 0) g = 'R';
    document.getElementById('gear').textContent = g;
    document.getElementById('fuel').textContent = Math.round(car.fuel) + '%';
    document.getElementById('damage').textContent = Math.round(car.damage) + '%';
    document.getElementById('camname').textContent = game.cameraCtrl._label(game.cameraCtrl.mode);
    this._drawRpm(car);
    this._drawMinimap(car, game);
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }
  }
  flash(msg) {
    // simple alert via mission box? use console + temporary
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;top:40%;left:50%;transform:translateX(-50%);background:rgba(0,229,255,0.9);color:#000;padding:12px 24px;border-radius:8px;font-weight:700;z-index:20;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
  _drawRpm(car) {
    const ctx = this.rpmCtx;
    const c = this.rpmCanvas;
    ctx.clearRect(0, 0, c.width, c.height);
    const cx = c.width / 2, cy = c.height / 2, r = 50;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    const ratio = Math.min(1, car.rpm / 7000);
    const start = Math.PI * 0.75;
    const end = start + ratio * (Math.PI * 2.25 - start);
    ctx.strokeStyle = ratio > 0.85 ? '#ff4444' : '#00e5ff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(car.rpm), cx, cy + 4);
  }
  _drawMinimap(car, game) {
    const ctx = this.miniCtx;
    const c = this.miniCanvas;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, c.width, c.height);
    const scale = c.width / 600;
    const cx = c.width / 2, cy = c.height / 2;
    // car
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(cx + car.position.x * scale, cy + car.position.z * scale, 3, 0, Math.PI * 2);
    ctx.fill();
    // traffic
    ctx.fillStyle = '#ffaa00';
    for (const t of game.world.trafficCars) {
      ctx.beginPath();
      ctx.arc(cx + t.group.position.x * scale, cy + t.group.position.z * scale, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // mission target
    if (game.mission) {
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(cx + game.mission.target.x * scale, cy + game.mission.target.z * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}