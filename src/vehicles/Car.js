import * as THREE from 'three';

export const CAR_SPECS = {
  sport: { name:'Sport GT', color:0xe53935, maxSpeed:42, accel:18, brake:28, steer:2.2, mass:1200, fuel:100, handling:0.9 },
  suv: { name:'SUV Trail', color:0x3a7bd5, maxSpeed:32, accel:12, brake:22, steer:1.6, mass:1800, fuel:120, handling:0.7 },
  truck: { name:'Cargo Truck', color:0xf9a825, maxSpeed:24, accel:8, brake:18, steer:1.2, mass:3200, fuel:150, handling:0.5 },
  compact: { name:'Compact City', color:0x43a047, maxSpeed:36, accel:15, brake:26, steer:2.6, mass:900, fuel:80, handling:1.0 },
  racer: { name:'Race Spec', color:0x8e24aa, maxSpeed:52, accel:24, brake:32, steer:2.4, mass:1000, fuel:70, handling:0.95 },
};

export class Car {
  constructor(game, id) {
    this.game = game;
    this.id = id;
    this.spec = CAR_SPECS[id] || CAR_SPECS.sport;
    this.group = new THREE.Group();
    this.bodyMesh = null;
    this.wheels = [];
    this._buildMesh();

    // physics state
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.heading = 0; // yaw radians
    this.speed = 0; // signed scalar along heading
    this.steerAngle = 0;
    this.rpm = 0;
    this.gear = 1; // 0 reverse, 1..5
    this.fuel = this.spec.fuel;
    this.damage = 0;
    this.boost = 1.0;
    this.boostCooldown = 0;
    this.handbrake = false;
    this.onGround = true;
  }

  _buildMesh() {
    const spec = this.spec;
    const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    this.group.add(body);
    this.bodyMesh = body;

    // cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.0), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.2 }));
    cabin.position.set(0, 1.15, -0.2);
    cabin.castShadow = true;
    this.group.add(cabin);

    // wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const positions = [
      { x: -1.05, z: 1.3, steer: true },
      { x: 1.05, z: 1.3, steer: true },
      { x: -1.05, z: -1.3, steer: false },
      { x: 1.05, z: -1.3, steer: false },
    ];
    for (const wp of positions) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wp.x, 0.35, wp.z);
      w.castShadow = true;
      this.group.add(w);
      this.wheels.push({ mesh: w, steer: wp.steer });
    }

    // steering wheel (cockpit) - small mesh inside
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 24), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    sw.position.set(0, 1.05, 0.6);
    sw.rotation.x = Math.PI / 2;
    this.group.add(sw);
    this.steeringWheelMesh = sw;
  }

  spawn(pos) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.heading = 0;
    this.gear = 1;
    this.fuel = this.spec.fuel;
    this.damage = 0;
    this.boost = 1.0;
    this.group.position.copy(pos);
    this.group.rotation.y = 0;
  }

  reset() {
    this.spawn(new THREE.Vector3(0, 1, 0));
  }

  update(dt, input, colliders) {
    const spec = this.spec;
    const steerSens = this.game.settings.steerSensitivity || 1;

    // fuel consumption
    if (this.fuel > 0) this.fuel -= Math.abs(this.speed) * 0.0008 * dt * 60;
    if (this.fuel < 0) this.fuel = 0;

    // input
    let throttle = 0;
    if (input.up) throttle = 1;
    if (input.down) throttle = -1; // brake / reverse
    let steerInput = 0;
    if (input.left) steerInput = 1;
    if (input.right) steerInput = -1;
    this.handbrake = !!input.handbrake;

    // steering
    const steerTarget = steerInput * spec.steer * steerSens;
    this.steerAngle += (steerTarget - this.steerAngle) * Math.min(1, dt * 8);
    // reduce steering at high speed
    const steerFactor = Math.max(0.3, 1 - Math.abs(this.speed) / spec.maxSpeed * 0.6);
    this.steerAngle *= steerFactor / Math.max(0.3, steerFactor); // no-op-ish; keep

    // acceleration model
    const maxSpeed = spec.maxSpeed + (this.boost > 0.1 ? 6 : 0);
    // gear
    this._updateGear();

    if (this.fuel <= 0) throttle = 0;

    // longitudinal
    let accel = 0;
    if (throttle > 0) {
      accel = spec.accel * throttle;
      if (input.boost && this.boost > 0) { accel *= 1.6; this.boost -= dt * 0.4; }
    } else if (throttle < 0) {
      if (this.speed > 0.5) {
        // braking
        accel = -spec.brake;
      } else {
        // reverse
        accel = spec.accel * 0.5 * throttle; // throttle negative
      }
    }
    // drag
    accel -= this.speed * 0.5;
    // handbrake
    if (this.handbrake) accel -= this.speed * 6;

    this.speed += accel * dt;
    // clamp
    if (this.speed > maxSpeed) this.speed = maxSpeed;
    if (this.speed < -spec.maxSpeed * 0.35) this.speed = -spec.maxSpeed * 0.35;

    // heading update
    const steerEffect = this.steerAngle * (Math.abs(this.speed) / (spec.maxSpeed * 0.5) + 0.2);
    // sign: when reversing, invert steering
    const steerSign = this.speed >= 0 ? 1 : -1;
    this.heading += steerSign * steerEffect * dt * 0.8;

    // position update
    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.velocity.copy(dir).multiplyScalar(this.speed);
    const newPos = this.position.clone().addScaledVector(this.velocity, dt);

    // collision
    const collided = this._collide(newPos, colliders);
    if (collided) {
      // bounce
      this.speed *= -0.2;
      this.damage = Math.min(100, this.damage + Math.abs(this.speed) * 0.5);
      this.velocity.set(0, 0, 0);
    } else {
      this.position.copy(newPos);
    }

    // keep on ground
    this.position.y = 1;

    // bounds
    if (Math.abs(this.position.x) > 295) { this.position.x = Math.sign(this.position.x) * 295; this.speed *= -0.3; }
    if (Math.abs(this.position.z) > 295) { this.position.z = Math.sign(this.position.z) * 295; this.speed *= -0.3; }

    // boost regen
    if (!input.boost) this.boost = Math.min(1.0, this.boost + dt * 0.15);
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);

    // rpm
    const speedRatio = Math.abs(this.speed) / spec.maxSpeed;
    this.rpm = 800 + speedRatio * 6000 + (throttle > 0 ? 500 : 0);

    // update group transform
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // wheels
    for (const w of this.wheels) {
      if (w.steer) w.mesh.rotation.y = this.steerAngle * 0.5;
      w.mesh.rotation.x -= this.speed * dt * 2;
    }
    // steering wheel mesh
    if (this.steeringWheelMesh) this.steeringWheelMesh.rotation.z = -this.steerAngle * 1.5;

    // damage visual: darken body
    if (this.bodyMesh) {
      const d = this.damage / 100;
      this.bodyMesh.material.color.setRGB(spec.color >> 16 & 255, (spec.color >> 8) & 255, spec.color & 255).multiplyScalar(1 - d * 0.4);
    }
  }

  _updateGear() {
    const s = Math.abs(this.speed);
    const ms = this.spec.maxSpeed;
    if (this.speed < -0.5) { this.gear = 0; return; } // R
    if (s < 0.5) { this.gear = 1; } // N/1
    else if (s < ms * 0.25) this.gear = 1;
    else if (s < ms * 0.45) this.gear = 2;
    else if (s < ms * 0.65) this.gear = 3;
    else if (s < ms * 0.85) this.gear = 4;
    else this.gear = 5;
    if (this.speed === 0 && !this.velocity.length()) this.gear = 1;
  }

  _collide(pos, colliders) {
    // car AABB approx
    const halfW = 1.1, halfL = 2.2;
    // compute car bbox in world
    // simple: check center point against colliders expanded
    for (const box of colliders) {
      // transform pos into box local? boxes are axis-aligned world
      const expanded = box.clone().expandByScalar(1.2);
      if (expanded.containsPoint(pos)) {
        // also ensure not just ground; ok
        return true;
      }
    }
    // also check distance to colliders via bounding
    return false;
  }
}