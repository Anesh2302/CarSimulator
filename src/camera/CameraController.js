import * as THREE from 'three';

export class CameraController {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    this.modes = ['third', 'hood', 'first', 'cinematic'];
    this.modeIndex = 0;
    this.mode = 'third';
    this._cinematicAngle = 0;
  }
  setMode(m) {
    this.mode = m;
    this.modeIndex = this.modes.indexOf(m);
    if (this.modeIndex < 0) this.modeIndex = 0;
    document.getElementById('camname').textContent = this._label(this.mode);
  }
  cycle() {
    this.modeIndex = (this.modeIndex + 1) % this.modes.length;
    this.mode = this.modes[this.modeIndex];
    this.setMode(this.mode);
  }
  _label(m) {
    return m === 'third' ? 'Third' : m === 'hood' ? 'Hood' : m === 'first' ? 'Cockpit' : 'Cinematic';
  }
  update(dt, car) {
    const cam = this.camera;
    const pos = car.position;
    const heading = car.heading;
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const right = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    let targetPos, lookAt;
    switch (this.mode) {
      case 'third':
        targetPos = pos.clone().addScaledVector(forward, -8).add(new THREE.Vector3(0, 4, 0));
        lookAt = pos.clone().add(new THREE.Vector3(0, 1.2, 0));
        break;
      case 'hood':
        targetPos = pos.clone().addScaledVector(forward, 1.8).add(new THREE.Vector3(0, 1.0, 0));
        lookAt = pos.clone().addScaledVector(forward, 20).add(new THREE.Vector3(0, 0.8, 0));
        break;
      case 'first':
        targetPos = pos.clone().add(new THREE.Vector3(0, 1.1, 0.4)).addScaledVector(forward, 0.2);
        // adjust: inside cabin looking forward
        targetPos = pos.clone().addScaledVector(forward, 0.3).add(new THREE.Vector3(0, 1.15, 0));
        lookAt = pos.clone().addScaledVector(forward, 30).add(new THREE.Vector3(0, 1.0, 0));
        break;
      case 'cinematic':
        this._cinematicAngle += dt * 0.4;
        const r = 14;
        targetPos = pos.clone().add(new THREE.Vector3(Math.cos(this._cinematicAngle) * r, 6, Math.sin(this._cinematicAngle) * r));
        lookAt = pos.clone().add(new THREE.Vector3(0, 1, 0));
        break;
    }
    // smooth follow
    cam.position.lerp(targetPos, Math.min(1, dt * 6));
    const look = lookAt;
    const m = new THREE.Matrix4().lookAt(cam.position, look, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    cam.quaternion.slerp(q, Math.min(1, dt * 8));
    cam.fov = this.game.settings.fov;
    cam.updateProjectionMatrix();
  }
}