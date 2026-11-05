export class InputManager {
  constructor() {
    this.state = {
      up:false, down:false, left:false, right:false,
      handbrake:false, boost:false,
      camPressed:false, resetPressed:false, pausePressed:false, menuPressed:false, weatherPressed:false,
    };
    this._keys = {};
    this._gp = { up:false, down:false, left:false, right:false, hb:false, boost:false, cam:false, reset:false, pause:false };
  }
  init() {
    const codeMap = (e) => e.code;
    window.addEventListener('keydown', e => {
      this._keys[e.code] = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.state.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.state.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.state.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.state.right = true;
      if (e.code === 'Space') this.state.handbrake = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.state.boost = true;
      if (e.code === 'KeyC') this.state.camPressed = true;
      if (e.code === 'KeyR') this.state.resetPressed = true;
      if (e.code === 'KeyP') this.state.pausePressed = true;
      if (e.code === 'Escape') this.state.menuPressed = true;
      if (e.code === 'KeyV') this.state.weatherPressed = true;
    });
    window.addEventListener('keyup', e => {
      this._keys[e.code] = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.state.up = this._keys['KeyW'] || this._keys['ArrowUp'] || false;
      // recompute properly
    });
    // simpler: recompute movement in update() from _keys
    // touch buttons
    document.querySelectorAll('.tbtn').forEach(btn => {
      const key = btn.dataset.key;
      const set = (v) => {
        if (key === 'ArrowUp') this._keys['ArrowUp'] = v;
        else if (key === 'ArrowDown') this._keys['ArrowDown'] = v;
        else if (key === 'ArrowLeft') this._keys['ArrowLeft'] = v;
        else if (key === 'ArrowRight') this._keys['ArrowRight'] = v;
        else if (key === ' ') this._keys['Space'] = v;
      };
      btn.addEventListener('touchstart', e => { e.preventDefault(); set(true); }, { passive:false });
      btn.addEventListener('touchend', e => { e.preventDefault(); set(false); }, { passive:false });
      btn.addEventListener('mousedown', () => set(true));
      btn.addEventListener('mouseup', () => set(false));
      btn.addEventListener('mouseleave', () => set(false));
    });
    document.getElementById('tcam')?.addEventListener('click', () => { this.state.camPressed = true; });
    document.getElementById('treset')?.addEventListener('click', () => { this.state.resetPressed = true; });

    this._raf = requestAnimationFrame(this._poll.bind(this));
  }

  _poll() {
    requestAnimationFrame(this._poll.bind(this));
    // gamepad
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps && gps[0];
    this._gp = { up:false, down:false, left:false, right:false, hb:false, boost:false, cam:false, reset:false, pause:false };
    if (gp) {
      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
      this._gp.left = ax < -0.25;
      this._gp.right = ax > 0.25;
      this._gp.up = ay < -0.25 || !!(gp.buttons[7] && gp.buttons[7].pressed);
      this._gp.down = ay > 0.25 || !!(gp.buttons[6] && gp.buttons[6].pressed);
      this._gp.hb = !!(gp.buttons[0] && gp.buttons[0].pressed);
      this._gp.boost = !!(gp.buttons[1] && gp.buttons[1].pressed);
      if (gp.buttons[2] && gp.buttons[2].pressed) this._gp.cam = true;
      if (gp.buttons[3] && gp.buttons[3].pressed) this._gp.reset = true;
      if (gp.buttons[9] && gp.buttons[9].pressed) this._gp.pause = true;
    }
  }

  update() {
    const k = this._keys;
    const up = !!(k['KeyW'] || k['ArrowUp']) || this._gp.up;
    const down = !!(k['KeyS'] || k['ArrowDown']) || this._gp.down;
    const left = !!(k['KeyA'] || k['ArrowLeft']) || this._gp.left;
    const right = !!(k['KeyD'] || k['ArrowRight']) || this._gp.right;
    const hb = !!(k['Space']) || this._gp.hb;
    const boost = !!(k['ShiftLeft'] || k['ShiftRight']) || this._gp.boost;
    this.state.up = up;
    this.state.down = down;
    this.state.left = left;
    this.state.right = right;
    this.state.handbrake = hb;
    this.state.boost = boost;
    if (this._gp.cam) this.state.camPressed = true;
    if (this._gp.reset) this.state.resetPressed = true;
    if (this._gp.pause) this.state.pausePressed = true;
  }
}