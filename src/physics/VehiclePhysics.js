// Pure vehicle physics helpers (testable, no Three.js)

export function computeSlipRatio(wheelAngularVelocity, vehicleSpeed, wheelRadius) {
  const wheelLinear = wheelAngularVelocity * wheelRadius;
  const denom = Math.max(Math.abs(vehicleSpeed), 0.1);
  return (wheelLinear - vehicleSpeed) / denom;
}

export function computeSlipAngle(steeringAngle, vehicleSpeed, yawRate, wheelbase) {
  if (Math.abs(vehicleSpeed) < 0.5) return 0;
  const beta = Math.atan2(yawRate * wheelbase * 0.5, vehicleSpeed);
  return steeringAngle - beta;
}

export function computeWeightTransfer(mass, longitudinalAccel, lateralAccel, wheelbase, trackWidth, cgHeight) {
  const longTransfer = (mass * longitudinalAccel * cgHeight) / wheelbase;
  const latTransfer = (mass * lateralAccel * cgHeight) / trackWidth;
  return { longTransfer, latTransfer };
}

export function computeLongitudinalForce(slipRatio, normalLoad, stiffness, gripLimit) {
  let F = stiffness * slipRatio;
  const maxF = normalLoad * gripLimit;
  if (F > maxF) F = maxF;
  if (F < -maxF) F = -maxF;
  return F;
}

export function computeLateralForce(slipAngle, normalLoad, corneringStiffness, gripLimit) {
  let F = corneringStiffness * slipAngle;
  const maxF = normalLoad * gripLimit;
  if (F > maxF) F = maxF;
  if (F < -maxF) F = -maxF;
  return F;
}

export function stepVehicle(state, input, params, dt) {
  // state: { speed, heading, yawRate, wheelOmegas:[4] }
  // input: { throttle, brake, steer, handbrake }
  const { mass, power, brakeForce, wheelRadius, wheelbase, cgHeight, trackWidth, tireGrip, tireStiffness, corneringStiffness, dragCoeff, rollingResistance } = params;
  const g = 9.81;

  // steering angle with speed sensitivity
  const steerLimit = params.steerLimit * Math.max(0.3, 1 - Math.abs(state.speed) / params.maxSpeed * 0.5);
  const steerAngle = input.steer * steerLimit;

  // engine/brake forces
  let engineForce = 0;
  if (input.throttle > 0) engineForce = power * input.throttle;
  let brake = 0;
  if (input.brake > 0) brake = brakeForce * input.brake;
  if (input.handbrake) brake += brakeForce * 0.8;

  // weight transfer
  const longAccelEst = (engineForce - brake) / mass;
  const latAccelEst = state.speed * steerAngle / wheelbase;
  const wt = computeWeightTransfer(mass, longAccelEst, latAccelEst, wheelbase, trackWidth, cgHeight);

  // static loads
  const staticLoad = mass * g / 4;
  const loads = [
    staticLoad - wt.longTransfer / 2 - wt.latTransfer / 2,
    staticLoad - wt.longTransfer / 2 + wt.latTransfer / 2,
    staticLoad + wt.longTransfer / 2 - wt.latTransfer / 2,
    staticLoad + wt.longTransfer / 2 + wt.latTransfer / 2,
  ];

  // wheel torques
  const driveWheels = params.drive === 'rwd' ? [2, 3] : [0, 1, 2, 3];
  const wheelTorque = engineForce * wheelRadius / driveWheels.length;
  const brakeTorque = brake * wheelRadius / 4;

  let fxTotal = 0;
  const newOmegas = state.wheelOmegas.slice();
  for (let i = 0; i < 4; i++) {
    const isDrive = driveWheels.includes(i);
    const torque = (isDrive ? wheelTorque : 0) - brakeTorque * Math.sign(state.speed || 1) - (input.handbrake && i >= 2 ? brakeTorque : 0);
    const inertia = params.wheelInertia || 1.2;
    newOmegas[i] += (torque / inertia) * dt;
    // rolling resistance torque
    newOmegas[i] -= Math.sign(newOmegas[i]) * rollingResistance * dt;
    const slipRatio = computeSlipRatio(newOmegas[i], state.speed, wheelRadius);
    const Fx = computeLongitudinalForce(slipRatio, loads[i], tireStiffness, tireGrip);
    fxTotal += Fx;
  }

  // drag
  const drag = dragCoeff * state.speed * Math.abs(state.speed);
  const rolling = rollingResistance * Math.sign(state.speed) * mass * g * 0.01;

  const ax = (fxTotal - drag - rolling) / mass;
  const newSpeed = state.speed + ax * dt;

  // yaw rate (bicycle model)
  let yawRate = state.yawRate;
  if (Math.abs(newSpeed) > 0.5) {
    const targetYawRate = newSpeed * Math.tan(steerAngle) / wheelbase;
    yawRate = yawRate * 0.7 + targetYawRate * 0.3;
  } else {
    yawRate *= 0.8;
  }
  const newHeading = state.heading + yawRate * dt;

  return {
    speed: newSpeed,
    heading: newHeading,
    yawRate,
    wheelOmegas: newOmegas,
    steerAngle,
    slipRatio: computeSlipRatio(newOmegas[0], newSpeed, wheelRadius),
  };
}