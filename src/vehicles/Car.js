import * as THREE from 'three';
import { assetLoader } from '../assets/AssetLoader.js';
import { CAR_MODELS } from '../assets/CarManifest.js';
import { stepVehicle } from '../physics/VehiclePhysics.js';

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
    this.yawRate = 0;
    this.wheelOmegas = [0,0,0,0];
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
    this.yawRate = 0;
    this.wheelOmegas = [0,0,0,0];
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
    let steerInput = 0;
    if (input.left) steerInput = 1;
    if (input.right) steerInput = -1;
    this.handbrake = !!input.handbrake;

    // steering input
    // (steering angle computed in physics step)

    // input mapping for physics
    let throttle = 0;
    let brake = 0;
    if (input.up) throttle = 1;
    if (input.down) {
      if (this.speed > 1) brake = 1;
      else throttle = -0.6; // reverse
    }
    if (this.fuel <= 0) throttle = 0;
    if (input.boost && this.boost > 0 && throttle > 0) { throttle *= 1.4; this.boost -= dt * 0.4; }

    this._updateGear();

    const maxSpeed = spec.maxSpeed + (this.boost > 0.1 ? 6 : 0);

    const params = {
      mass: spec.mass,
      power: spec.accel * spec.mass * 0.6,
      brakeForce: spec.brake * spec.mass * 0.5,
      wheelRadius: 0.35,
      wheelbase: 2.6,
      cgHeight: 0.5,
      trackWidth: 1.6,
      tireGrip: spec.handling * (sim ? 0.9 : 1.1),
      tireStiffness: 6000,
      corneringStiffness: 4000,
      dragCoeff: 0.35 * (sim ? 1.2 : 1.0),
      rollingResistance: 0.6,
      steerLimit: spec.steer * (sim ? 0.85 : 1.0),
      maxSpeed,
      drive: 'rwd',
      wheelInertia: 1.2,
    };

    const state = { speed: this.speed, heading: this.heading, yawRate: this.yawRate || 0, wheelOmegas: this.wheelOmegas || [0,0,0,0] };
    const next = stepVehicle(state, { throttle, brake, steer: steerInput, handbrake: this.handbrake }, params, dt);

    this.speed = next.speed;
    if (this.speed > maxSpeed) this.speed = maxSpeed;
    if (this.speed < -spec.maxSpeed * 0.35) this.speed = -spec.maxSpeed * 0.35;
    this.heading = next.heading;
    this.yawRate = next.yawRate;
    this.wheelOmegas = next.wheelOmegas;
    this.steerAngle = next.steerAngle;
    this.slip = Math.abs(next.slipRatio);

    // handbrake extra
    if (this.handbrake) this.speed *= 0.92;

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

    // suspension offsets
    if (!this.suspOffsets) this.suspOffsets = [0,0,0,0];
    const longTransfer = Math.min(0.05, Math.abs(this.speed)/spec.maxSpeed * 0.04);
    const latTransfer = Math.min(0.05, Math.abs(this.steerAngle) * 0.03);
    // FL, FR, RL, RR
    this.suspOffsets[0] = -longTransfer*0.5 + latTransfer*0.5;
    this.suspOffsets[1] = -longTransfer*0.5 - latTransfer*0.5;
    this.suspOffsets[2] = longTransfer*0.5 + latTransfer*0.5;
    this.suspOffsets[3] = longTransfer*0.5 - latTransfer*0.5;

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
    if (!this.suspOffsets) this.suspOffsets = [0,0,0,0];
    this.wheels.forEach((w, i) => {
      const node = w.node || w.mesh;
      if (!node) return;
      if (w.steer) node.rotation.y = this.steerAngle * 0.5;
      node.rotation.x -= this.speed * dt * 2;
      node.position.y = 0.35 + (this.suspOffsets[i] || 0);
    });
    const swNode = this.steeringNode || this.steeringWheelMesh;
    if (swNode) swNode.rotation.z = -this.steerAngle * 1.5;
  }

  _updateGear() {
    const prev = this.gear;
    const s = Math.abs(this.speed);
    const ms = this.spec.maxSpeed;
    if (this.speed < -0.5) { this.gear = 0; } // R
    else if (s < 0.5) { this.gear = 1; }
    else if (s < ms * 0.25) this.gear = 1;
    else if (s < ms * 0.45) this.gear = 2;
    else if (s < ms * 0.65) this.gear = 3;
    else if (s < ms * 0.85) this.gear = 4;
    else this.gear = 5;
    if (this.speed === 0) this.gear = 1;
    if (prev !== this.gear && this.game.audio && this.game.audio.playGearShift) {
      this.game.audio.playGearShift();
    }
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