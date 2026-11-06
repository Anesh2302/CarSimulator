// Four-wheel vehicle dynamics (custom, deterministic, testable)
// State uses 2D ground plane (x,z) + yaw. Suspension compression per wheel.

const WHEEL_POSITIONS = [
  { x: -0.9, z: 1.3 }, // FL
  { x: 0.9, z: 1.3 },  // FR
  { x: -0.9, z: -1.3 }, // RL
  { x: 0.9, z: -1.3 }, // RR
];

function rotate(x, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: x * c - z * s, z: x * s + z * c };
}

export function stepDynamics(state, input, params, dt, groundHeight = () => 0) {
  const {
    mass, power, brakeForce, wheelRadius, wheelbase, cgHeight,
    trackWidth, tireGrip, tireLongStiff, tireLatStiff, dragCoeff,
    rollingResistance, steerLimit, maxSpeed, drive, wheelInertia,
    yawInertia, suspStiffness, suspDamping, suspRestLength, suspMaxTravel,
  } = params;

  const g = 9.81;
  const yaw = state.yaw;
  const vx = state.vx; // body local longitudinal velocity
  const vz = state.vz; // body local lateral velocity
  const yawRate = state.yawRate;

  // steering angle (speed sensitive)
  const speedAbs = Math.hypot(vx, vz);
  const steerSens = Math.max(0.3, 1 - speedAbs / params.maxSpeed * 0.5);
  const steerAngle = input.steer * steerLimit * steerSens;

  // wheel steering angles
  const wheelSteer = [steerAngle, steerAngle, 0, 0];

  // suspension & contact
  const wheels = state.wheels.map((w, i) => ({ ...w }));
  const wheelForces = wheels.map(() => ({ fx: 0, fy: 0, fz: 0 }));
  const wheelLoads = [0, 0, 0, 0];

  // body position in world
  const bodyX = state.x;
  const bodyZ = state.z;
  const bodyY = 1.0; // nominal height

  for (let i = 0; i < 4; i++) {
    const mount = WHEEL_POSITIONS[i];
    // world position of wheel mount
    const rm = rotate(mount.x, mount.z, yaw);
    const mountX = bodyX + rm.x;
    const mountZ = bodyZ + rm.z;
    const gh = groundHeight(mountX, mountZ);

    // suspension compression: distance from mount to ground minus rest length
    const mountHeight = bodyY;
    const requiredCompression = mountHeight - gh - wheelRadius;
    let compression = 0;
    let contact = false;
    if (requiredCompression >= 0 && requiredCompression <= suspMaxTravel) {
      compression = requiredCompression;
      contact = true;
    } else if (requiredCompression > suspMaxTravel) {
      compression = suspMaxTravel;
      contact = true;
    }
    // spring-damper
    const suspVel = wheels[i].suspVel;
    const springForce = suspStiffness * compression;
    const damperForce = suspDamping * suspVel;
    const suspForce = springForce - damperForce;
    wheels[i].suspVel += (suspForce / 50 - g) * dt;
    wheels[i].susp = compression;
    if (wheels[i].susp < 0) { wheels[i].susp = 0; wheels[i].suspVel = 0; }
    if (wheels[i].susp > suspMaxTravel) { wheels[i].susp = suspMaxTravel; wheels[i].suspVel = 0; }

    const load = contact ? Math.max(0, suspForce) : 0;
    wheelLoads[i] = load;
    wheels[i].load = load;
    wheels[i].contact = contact;
    wheels[i].compression = wheels[i].susp;
  }

  // engine/brake torque
  const throttle = input.throttle || 0;
  const brake = input.brake || 0;
  const handbrake = !!input.handbrake;
  const reverse = throttle < 0;

  const engineForce = throttle > 0 ? power * throttle : (throttle < 0 ? power * throttle * 0.5 : 0);
  const brakeForceTotal = brake * brakeForce + (handbrake ? brakeForce * 0.8 : 0);

  const driveWheels = drive === 'fwd' ? [0, 1] : drive === 'awd' ? [0, 1, 2, 3] : [2, 3];

  // wheel torques
  const wheelTorque = [0, 0, 0, 0];
  const torquePerDrive = driveWheels.length > 0 ? (engineForce * wheelRadius) / driveWheels.length : 0;
  for (const i of driveWheels) wheelTorque[i] += torquePerDrive;
  for (let i = 0; i < 4; i++) wheelTorque[i] -= (brakeForceTotal * wheelRadius) / 4;
  if (handbrake) { wheelTorque[2] -= brakeForceTotal * wheelRadius * 0.5; wheelTorque[3] -= brakeForceTotal * wheelRadius * 0.5; }

  // compute tire forces
  for (let i = 0; i < 4; i++) {
    const w = wheels[i];
    const mount = WHEEL_POSITIONS[i];
    const rm = rotate(mount.x, mount.z, yaw);
    // wheel velocity in world
    const wheelWorldVx = vx - yawRate * rm.z; // body local
    const wheelWorldVz = vz + yawRate * rm.x;
    // rotate to wheel frame (steer)
    const sa = wheelSteer[i];
    const csa = Math.cos(sa), ssa = Math.sin(sa);
    const longVel = wheelWorldVx * csa + wheelWorldVz * ssa;
    const latVel = -wheelWorldVx * ssa + wheelWorldVz * csa;

    const predictedOmega = w.omega + (wheelTorque[i] / wheelInertia) * dt;
    const slipRatio = computeSlipRatioLocal(predictedOmega, longVel, wheelRadius);
    const slipAngle = Math.atan2(latVel, Math.max(Math.abs(longVel), 0.1));

    // forces in wheel frame
    let Fx = tireLongStiff * slipRatio;
    let Fy = tireLatStiff * slipAngle;

    // friction circle
    const load = Math.max(0, wheelLoads[i]);
    const maxF = load * tireGrip;
    const mag = Math.hypot(Fx, Fy);
    if (mag > maxF && mag > 0) {
      const scale = maxF / mag;
      Fx *= scale;
      Fy *= scale;
    }

    // transform back to body frame
    const FxBody = Fx * csa - Fy * ssa;
    const FyBody = Fx * ssa + Fy * csa;

    wheelForces[i].fx = FxBody;
    wheelForces[i].fy = FyBody;
    w.slipRatio = slipRatio;
    w.slipAngle = slipAngle;
    w.Fx = Fx;
    w.Fy = Fy;

    // update wheel omega
    const torque = wheelTorque[i] - Fx * wheelRadius;
    w.omega += (torque / wheelInertia) * dt;
    // rolling resistance
    w.omega -= Math.sign(w.omega || 1) * rollingResistance * 0.1 * dt;
  }

  // sum forces in body frame
  let FxTotal = 0, FzTotal = 0, torqueYaw = 0;
  for (let i = 0; i < 4; i++) {
    const mount = WHEEL_POSITIONS[i];
    FxTotal += wheelForces[i].fx;
    FzTotal += wheelForces[i].fy; // lateral in body frame (z)
    torqueYaw += mount.x * wheelForces[i].fy - mount.z * wheelForces[i].fx;
  }

  // drag
  const drag = dragCoeff * speedAbs * speedAbs;
  const dragDir = speedAbs > 0 ? 1 : -1;
  FxTotal -= drag * dragDir;

  // rolling resistance
  FxTotal -= rollingResistance * Math.sign(vx || 1) * mass * g * 0.01;

  // integrate
  const ax = FxTotal / mass;
  const az = FzTotal / mass;
  const alpha = torqueYaw / (yawInertia || (mass * 2.5));

  const newVx = vx + ax * dt;
  const newVz = vz + az * dt;
  const newYawRate = yawRate + alpha * dt;
  const newYaw = yaw + newYawRate * dt;

  // position update (body frame to world)
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const worldVx = newVx * c - newVz * s;
  const worldVz = newVx * s + newVz * c;
  const newX = state.x + worldVx * dt;
  const newZ = state.z + worldVz * dt;

  // slip aggregate
  const slip = Math.max(...wheels.map(w => Math.abs(w.slipRatio)));

  return {
    x: newX,
    z: newZ,
    yaw: newYaw,
    vx: newVx,
    vz: newVz,
    yawRate: newYawRate,
    wheels,
    steerAngle,
    slip,
    speed: Math.hypot(newVx, newVz),
  };
}

function computeSlipRatioLocal(omega, longVel, radius) {
  const wheelLinear = omega * radius;
  const denom = Math.max(Math.abs(longVel), 0.1);
  return (wheelLinear - longVel) / denom;
}

export { WHEEL_POSITIONS };
