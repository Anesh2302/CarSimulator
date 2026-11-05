import * as THREE from 'three';
import { assetLoader } from '../assets/AssetLoader.js';
import { CAR_MODELS } from '../assets/CarManifest.js';

export const CAR_SPECS = {
  blender: { name:'Blender Test Vehicle', color:0x3a7bd5, maxSpeed:40, accel:16, brake:26, steer:2.0, mass:1300, fuel:100, handling:0.85 },
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
    this._maybeLoadModel();

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
      this.wheels.push({ mesh: w, node: w, steer: wp.steer });
    }

    // steering wheel (cockpit) - small mesh inside
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 24), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    sw.position.set(0, 1.05, 0.6);
    sw.rotation.x = Math.PI / 2;
    this.group.add(sw);
    this.steeringWheelMesh = sw;
    this.steeringNode = sw;
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
    const sim = this.game.settings.physicsMode === 'simulation';

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
    const steerLimit = sim ? spec.steer * 0.85 : spec.steer;
    const speedSteerFactor = Math.max(0.35, 1 - Math.abs(this.speed) / spec.maxSpeed * 0.55);
    const steerTarget = steerInput * steerLimit * steerSens * speedSteerFactor;
    const steerRate = sim ? 6 : 8;
    this.steerAngle += (steerTarget - this.steerAngle) * Math.min(1, dt * steerRate);

    // acceleration model
    const maxSpeed = spec.maxSpeed + (this.boost > 0.1 ? 6 : 0);
    // gear
    this._updateGear();

    if (this.fuel <= 0) throttle = 0;

    // longitudinal
    let accel = 0;
    if (throttle > 0) {
      accel = spec.accel * throttle * (sim ? 0.9 : 1.0);
      // traction control: limit accel at high speed
      if (sim && this.speed > spec.maxSpeed * 0.75) accel *= 0.6;
      if (input.boost && this.boost > 0) { accel *= 1.6; this.boost -= dt * 0.4; }
    } else if (throttle < 0) {
      if (this.speed > 0.5) {
        // braking (ABS: modulate to avoid lock)
        accel = -spec.brake * (sim ? 1.05 : 1.0);
        if (sim && this.speed < 8) accel *= 0.7;
      } else {
        // reverse
        accel = spec.accel * 0.5 * throttle; // throttle negative
      }
    }
    // drag + weight transfer
    const dragMult = sim ? 1.25 : 1.0;
    accel -= this.speed * 0.5 * dragMult;
    // handbrake
    if (this.handbrake) accel -= this.speed * (sim ? 8 : 6);

    this.speed += accel * dt;
    // clamp
    if (this.speed > maxSpeed) this.speed = maxSpeed;
    if (this.speed < -spec.maxSpeed * 0.35) this.speed = -spec.maxSpeed * 0.35;

    // heading update
    const steerEffect = this.steerAngle * (Math.abs(this.speed) / (spec.maxSpeed * 0.5) + 0.2);
    // sign: when reversing, invert steering
    const steerSign = this.speed >= 0 ? 1 : -1;
    this.heading += steerSign * steerEffect * dt * 0.8;

    // tire grip / weight transfer / slip
    const turnSlip = Math.abs(this.steerAngle) * Math.abs(this.speed) / Math.max(1, spec.maxSpeed);
    const weightTransfer = Math.min(0.3, Math.abs(this.speed) / spec.maxSpeed * 0.25);
    const gripFactor = Math.max(0.4, 1 - turnSlip * 0.5 - (sim ? weightTransfer * 0.3 : weightTransfer * 0.15));
    // traction control
    if (sim && throttle > 0 && this.speed > spec.maxSpeed * 0.7) {
      accel *= 0.7;
    }
    // apply grip as small speed bleed in hard turns
    this.speed *= (1 - (1 - gripFactor) * 0.012);

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
      if (this.game.audio && this.game.audio.playCollision) this.game.audio.playCollision(Math.abs(this.speed)*2);
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

    // suspension visual offset (simple)
    this.group.position.y = 1 + Math.sin(this.position.x*0.1 + this.position.z*0.1) * 0.0; // placeholder no terrain

    // damage visual: darken body
    if (this.bodyMesh) {
      const d = this.damage / 100;
      this.bodyMesh.material.color.setRGB(((spec.color >> 16) & 255)/255, ((spec.color >> 8) & 255)/255, (spec.color & 255)/255).multiplyScalar(1 - d * 0.4);
    }
  }

  updateVisuals(dt) {
    for (const w of this.wheels) {
      const node = w.node || w.mesh;
      if (!node) continue;
      if (w.steer) node.rotation.y = this.steerAngle * 0.5;
      node.rotation.x -= this.speed * dt * 2;
    }
    const swNode = this.steeringNode || this.steeringWheelMesh;
    if (swNode) swNode.rotation.z = -this.steerAngle * 1.5;
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

  _maybeLoadModel() {
    const manifest = CAR_MODELS[this.id];
    if (!manifest) return;
    assetLoader.loadGLTF(manifest.url).then(gltf => {
      // validate
      if (!gltf || !gltf.scene) throw new Error('Invalid GLTF');
      // remove old only after successful load
      while (this.group.children.length) this.group.remove(this.group.children[0]);
      const root = gltf.scene;
      this.group.add(root);
      const find = (n) => (n ? root.getObjectByName(n) : null);
      const steerFlags = { FL: true, FR: true, RL: false, RR: false };
      this.wheels = [];
      for (const key of ['FL', 'FR', 'RL', 'RR']) {
        const node = find(manifest.nodes.wheels[key]);
        if (node) this.wheels.push({ mesh: node, node, steer: steerFlags[key] });
      }
      this.steeringNode = find(manifest.nodes.steeringWheel);
      this.steeringWheelMesh = this.steeringNode;
      this.bodyMesh = find(manifest.nodes.body) || this.bodyMesh;
    }).catch(err => {
      console.warn('Model load failed, keeping procedural:', err);
    });
  }

  _collide(pos, colliders) {
    // check multiple points around car
    const pts = [
      pos.clone(),
      pos.clone().add(new THREE.Vector3(Math.sin(this.heading)*2,0,Math.cos(this.heading)*2)),
      pos.clone().add(new THREE.Vector3(-Math.sin(this.heading)*2,0,-Math.cos(this.heading)*2)),
      pos.clone().add(new THREE.Vector3(Math.cos(this.heading)*1,0,-Math.sin(this.heading)*1)),
      pos.clone().add(new THREE.Vector3(-Math.cos(this.heading)*1,0,Math.sin(this.heading)*1)),
    ];
    for (const box of colliders) {
      const expanded = box.clone().expandByScalar(0.6);
      for (const p of pts) {
        if (expanded.containsPoint(p)) return true;
      }
    }
    return false;
  }
}