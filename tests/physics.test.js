import { describe, it, expect } from 'vitest';
import { computeSlipRatio, computeWeightTransfer, computeLongitudinalForce, stepVehicle } from '../src/physics/VehiclePhysics.js';

describe('VehiclePhysics', () => {
  it('slip ratio zero when wheel matches speed', () => {
    const r = computeSlipRatio(10 / 0.35, 10, 0.35);
    expect(Math.abs(r)).toBeLessThan(1e-6);
  });
  it('weight transfer increases with accel', () => {
    const w0 = computeWeightTransfer(1000, 0, 0, 2.6, 1.5, 0.5);
    const w1 = computeWeightTransfer(1000, 5, 0, 2.6, 1.5, 0.5);
    expect(Math.abs(w1.longTransfer)).toBeGreaterThan(Math.abs(w0.longTransfer));
  });
  it('longitudinal force clamped by grip', () => {
    const F = computeLongitudinalForce(10, 4000, 10000, 1.0);
    expect(Math.abs(F)).toBeLessThanOrEqual(4000 + 1e-6);
  });
  it('stepVehicle accelerates with throttle', () => {
    const state = { speed: 0, heading: 0, yawRate: 0, wheelOmegas: [0,0,0,0] };
    const params = { mass:1200, power:4000, brakeForce:8000, wheelRadius:0.35, wheelbase:2.6, cgHeight:0.5, trackWidth:1.5, tireGrip:1.0, tireStiffness:5000, corneringStiffness:4000, dragCoeff:0.3, rollingResistance:0.5, steerLimit:0.6, maxSpeed:40, drive:'rwd', wheelInertia:1.2 };
    const next = stepVehicle(state, { throttle:1, brake:0, steer:0, handbrake:false }, params, 0.1);
    expect(next.speed).toBeGreaterThan(0);
  });
  it('stepVehicle brakes', () => {
    const state = { speed: 20, heading: 0, yawRate: 0, wheelOmegas: [57,57,57,57] };
    const params = { mass:1200, power:4000, brakeForce:8000, wheelRadius:0.35, wheelbase:2.6, cgHeight:0.5, trackWidth:1.5, tireGrip:1.0, tireStiffness:5000, corneringStiffness:4000, dragCoeff:0.3, rollingResistance:0.5, steerLimit:0.6, maxSpeed:40, drive:'rwd', wheelInertia:1.2 };
    const next = stepVehicle(state, { throttle:0, brake:1, steer:0, handbrake:false }, params, 0.1);
    expect(next.speed).toBeLessThan(20);
  });
});