# Architecture

- `src/main.js`: bootstrap, exposes `window.game` for debugging.
- `src/game/Game.js`: renderer, scene, camera, loop, state machine (loading/menu/playing/paused), mission integration.
- `src/world/World.js`: terrain, roads, buildings, parking, signals, traffic lights, day/night, weather, rain, spawns traffic/peds.
- `src/vehicles/Car.js`: player vehicle mesh + arcade physics + collision + damage + fuel/gear.
- `src/vehicles/TrafficCar.js`, `Pedestrian.js`: ambient world entities.
- `src/camera/CameraController.js`: third/hood/first/cinematic modes.
- `src/input/InputManager.js`: keyboard, touch, gamepad.
- `src/audio/AudioManager.js`: Web Audio engine/tire sounds.
- `src/ui/HUD.js`: speedometer, RPM, minimap, dashboard.
- `src/ui/Menu.js`: main menu, garage, settings, missions, controls.
- `src/storage/SaveManager.js`: localStorage settings/progress.
- `src/missions/Missions.js`: mission definitions.

Rendering: Three.js WebGLRenderer with shadows, ACES tone mapping, fog.
Physics: custom arcade model (no external physics engine) for portability.
Persistence: localStorage.