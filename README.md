# 3D Car Simulator

A fully playable, browser-based 3D car driving simulator built with **Three.js** and **Vite**. It features realistic arcade vehicle physics, multiple camera modes, a living city, traffic, pedestrians, weather and day/night cycle, missions, garage, customization, audio, settings, and save/load.

## Features

- Realistic 3D vehicle + open-world city, roads, highways, parking areas
- Smooth acceleration, braking, reverse, steering, handbrake, boost
- Camera modes: third-person, hood, first-person cockpit, cinematic
- Functional dashboard: speedometer, RPM, fuel, gear, damage, camera name
- 5 cars with distinct handling/stats (Sport GT, SUV, Truck, Compact, Racer)
- Traffic vehicles, pedestrians, traffic signals
- Collision detection + damage simulation
- Weather (clear/rain/fog) and day/night cycle with dynamic lighting
- Engine, tire and ambient audio (Web Audio)
- Missions: checkpoints, parking challenge, highway run
- Garage + vehicle selection + customization (color via car choice)
- Keyboard, gamepad (controller), mobile touch controls
- Settings: graphics, shadows, audio, steering sensitivity, FOV, touch
- Save/load progress & settings (localStorage)

## Installation

```bash
cd CarSimulator
npm install
npm run dev
```

## Blender (optional)
```bash
npm run blender:check
npm run blender:create-test
npm run blender:validate
npm run blender:export
npm run blender:watch
```

Open http://localhost:5173

### Production build

```bash
npm run build
npm run preview
```

## Controls

Keyboard:
- W / Arrow Up: Accelerate
- S / Arrow Down: Brake / Reverse
- A / Arrow Left: Steer Left
- D / Arrow Right: Steer Right
- Space: Handbrake
- Shift: Boost
- C: Cycle camera
- R: Reset car
- V: Cycle weather
- P: Pause
- Esc: Menu

Gamepad: left stick steer, triggers accelerate/brake, A handbrake, B boost, X camera, Y reset, Start pause.

Touch: on-screen buttons appear on touch devices.

## Architecture

See `docs/ARCHITECTURE.md`.

## New in Professional Upgrade
- Blender/GLTF asset pipeline + placeholder GLB.
- Arcade/Simulation physics modes.
- Game modes: Free Roam, Time Trial, Checkpoint, Parking, Vehicle Test.
- Controller calibration + dead-zone/invert settings.
- Additional docs.

## Testing

```bash
npm run build
```

Manual test checklist in `TESTING.md`.

## License

MIT