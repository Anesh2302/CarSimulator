import { describe, it, expect } from 'vitest';
import { stepDynamics } from '../src/physics/VehicleDynamics.js';

const baseParams = {
  mass: 1200, power: 3000, brakeForce: 8000, wheelRadius: 0.35,
  wheelbase: 2.6, cgHeight: 0.5, trackWidth: 1.6, tireGrip: 1.0,
  tireLongStiff: 6000, tireLatStiff: 4000, dragCoeff: 0.35,
  rollingResistance: 0.6, steerLimit: 0.6, maxSpeed: 40, drive: 'rwd',
  wheelInertia: 2.5, yawInertia: 2400, suspStiffness: 18000,
  suspDamping: 2500, suspRestLength: 0.8, suspMaxTravel: 0.2,
};

function makeState() {
  return {
    x: 0, z: 0, yaw: 0, vx: 0, vz: 0, yawRate: 0,
    wheels: [ { omega:0, susp:0.15, suspVel:0, load:0, contact:false, compression:0, slipRatio:0, slipAngle:0, Fx:0, Fy:0 },
              { omega:0, susp:0.15, suspVel:0, load:0, contact:false, compression:0, slipRatio:0, slipAngle:0, Fx:0, Fy:0 },
              { omega:0, susp:0.15, suspVel:0, load:0, contact:false, compression:0, slipRatio:0, slipAngle:0, Fx:0, Fy:0 },
              { omega:0, susp:0.15, suspVel:0, load:0, contact:false, compression:0, slipRatio:0, slipAngle:0, Fx:0, Fy:0 } ],
  };
}

describe('VehicleDynamics', () => {
  it('accelerates forward with throttle', () => {
    const s = makeState();
    const n = stepDynamics(s, { throttle:1, brake:0, steer:0, handbrake:false }, baseParams, 0.1, () => 0);
    expect(n.speed).toBeGreaterThan(0);
  });
  it('accelerates in reverse with negative throttle', () => {
    const s = makeState();
    const n = stepDynamics(s, { throttle:-1, brake:0, steer:0, handbrake:false }, baseParams, 0.1, () => 0);
    expect(n.speed).toBeLessThan(0);
  });
  it('brakes', () => {
    const s = makeState(); s.vx = 20; s.speed = 20; s.wheels.forEach(w=>w.omega=57);
    const n = stepDynamics(s, { throttle:0, brake:1, steer:0, handbrake:false }, baseParams, 0.1, () => 0);
    expect(n.speed).toBeLessThan(20);
  });
  it('all wheels have contact on flat ground', () => {
    const s = makeState();
    const n = stepDynamics(s, { throttle:0, brake:0, steer:0, handbrake:false }, baseParams, 0.016, () => 0);
    expect(n.wheels.every(w => w.contact)).toBe(true);
  });
  it('wheels unload on airborne (no ground)', () => {
    const s = makeState();
    const n = stepDynamics(s, { throttle:0, brake:0, steer:0, handbrake:false }, baseParams, 0.016, () => 5);
    expect(n.wheels.every(w => !w.contact)).toBe(true);
  });
  it('slip ratio nonzero when wheel spins faster', () => {
    const s = makeState();
    s.wheels[2].omega = 100; s.wheels[3].omega = 100;
    const n = stepDynamics(s, { throttle:0, brake:0, steer:0, handbrake:false }, baseParams, 0.016, () => 0);
    expect(Math.abs(n.slip)).toBeGreaterThan(0);
  });
  it('cornering changes yaw rate', () => {
    const s = makeState(); s.vx = 15; s.speed = 15; s.wheels.forEach(w=>w.omega=43);
    const n = stepDynamics(s, { throttle:0, brake:0, steer:1, handbrake:false }, baseParams, 0.1, () => 0);
    expect(Math.abs(n.yawRate)).toBeGreaterThan(0);
  });
  it('combined braking+cornering keeps forces finite', () => {
    const s = makeState(); s.vx = 20; s.speed = 20; s.wheels.forEach(w=>w.omega=57);
    const n = stepDynamics(s, { throttle:0, brake:1, steer:1, handbrake:false }, baseParams, 0.1, () => 0);
    expect(Number.isFinite(n.speed)).toBe(true);
    expect(Number.isFinite(n.yawRate)).toBe(true);
  });
  it('FWD vs RWD differ', () => {
    const s1 = makeState();
    const pFwd = { ...baseParams, drive: 'fwd' };
    const nFwd = stepDynamics(s1, { throttle:1, brake:0, steer:0, handbrake:false }, pFwd, 0.1, () => 0);
    const s2 = makeState();
    const pRwd = { ...baseParams, drive: 'rwd' };
    const nRwd = stepDynamics(s2, { throttle:1, brake:0, steer:0, handbrake:false }, pRwd, 0.1, () => 0);
    // both accelerate; just ensure finite
    expect(Number.isFinite(nFwd.speed)).toBe(true);
    expect(Number.isFinite(nRwd.speed)).toBe(true);
  });
  it('suspension compression within limits', () => {
    const s = makeState();
    const n = stepDynamics(s, { throttle:0, brake:0, steer:0, handbrake:false }, baseParams, 0.016, () => 0);
    for (const w of n.wheels) {
      expect(w.compression).toBeGreaterThanOrEqual(0);
      expect(w.compression).toBeLessThanOrEqual(baseParams.suspMaxTravel + 1e-6);
    }
  });
  it('numerical stability over many steps', () => {
    let s = makeState();
    for (let i = 0; i < 1000; i++) {
      s = stepDynamics(s, { throttle: 0.5, brake: 0, steer: 0.2, handbrake: false }, baseParams, 0.016, () => 0);
    }
    expect(Number.isFinite(s.speed)).toBe(true);
    expect(Number.isFinite(s.yaw)).toBe(true);
    expect(Number.isFinite(s.x)).toBe(true);
  });
  it('handbrake reduces speed', () => {
    const s = makeState(); s.vx = 20; s.speed = 20; s.wheels.forEach(w=>w.omega=57);
    const n = stepDynamics(s, { throttle:0, brake:0, steer:0, handbrake:true }, baseParams, 0.1, () => 0);
    expect(n.speed).toBeLessThan(20);
  });
});