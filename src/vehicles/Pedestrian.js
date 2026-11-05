import * as THREE from 'three';

export class Pedestrian {
  constructor(game) { this.game = game; this.group = new THREE.Group(); this.speed = 1.2; this.dir = new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5).normalize(); this.timer = 0; }
  spawn(pos) {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color: 0xddaa88 }));
    body.position.y = 0.9;
    body.castShadow = true;
    this.group.add(body);
    this.group.position.copy(pos);
  }
  update(dt, world) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.dir.set(Math.random()-0.5, 0, Math.random()-0.5).normalize();
      this.timer = 2 + Math.random() * 4;
    }
    this.group.position.addScaledVector(this.dir, this.speed * dt);
    // keep in bounds
    if (Math.abs(this.group.position.x) > 290) this.dir.x *= -1;
    if (Math.abs(this.group.position.z) > 290) this.dir.z *= -1;
  }
}