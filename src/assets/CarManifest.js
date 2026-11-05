export const CAR_MODELS = {
  blender: {
    url: '/models/blender_vehicle.glb',
    nodes: {
      body: 'Body',
      wheels: { FL: 'Wheel_FL', FR: 'Wheel_FR', RL: 'Wheel_RL', RR: 'Wheel_RR' },
      steeringWheel: 'SteeringWheel',
      glass: 'Glass',
    },
  },
  sport: {
    url: '/models/car_placeholder.glb',
    nodes: {
      body: 'Body',
      wheels: { FL: 'Wheel_FL', FR: 'Wheel_FR', RL: 'Wheel_RL', RR: 'Wheel_RR' },
      steeringWheel: 'SteeringWheel',
      glass: 'Glass',
    },
  },
};
// Other cars fall back to procedural until models are provided.