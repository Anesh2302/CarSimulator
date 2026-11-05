import * as THREE from 'three';

export class TrafficCar {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.speed = 8 + Math.random() * 6;
    this.axis = 'x';
    this.dir = 1;
    this.turnTimer = 0;
  }
  spawn(pos, axis) {
    this.axis = axis;
    // simple car mesh
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x4466aa }));
    body.position.y = 0.5;
    body.castShadow = true;
    this.group.add(body);
    this.group.position.copy(pos);
    if (axis === 'z') this.group.rotation.y = Math.PI / 2;
  }
  update(dt, world) {
    if (this.axis === 'x') {
      this.group.position.x += this.speed * dt;
      if (this.group.position.x > 290) this.group.position.x = -290;
    } else {
      this.group.position.z += this.speed * dt;
      if (this.group.position.z > 290) this.group.position.z = -290;
    }
  }
}