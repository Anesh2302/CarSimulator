# Testing

## Automated
- `npm run build` must succeed.

## Manual checklist
1. Load game -> menu appears (no console errors).
2. Play -> car spawns, HUD visible.
3. Accelerate/brake/reverse/steer work.
4. Handbrake (Space) stops car.
5. Camera cycle (C) switches Third/Hood/Cockpit/Cinematic.
6. Reset (R) resets car.
7. Collision with building/barrier causes bounce + damage.
8. Weather (V) cycles clear/rain/fog.
9. Day/night cycle visible over time.
10. Garage switches car and persists after reload.
11. Settings persist after reload.
12. Missions start and complete on reaching target.
13. Touch controls appear on touch device.
14. Gamepad (if connected) controls car.
15. Audio plays after first interaction.

## Browser test (dev)
Run `npm run dev`, open http://localhost:5173.

## Blender integration tests
1. `npm run blender:check` -> Blender 5.2.3 LTS.
2. `npm run blender:create-test` -> creates blend.
3. `npm run blender:validate` -> VALIDATION_OK.
4. `npm run blender:export` -> EXPORT_OK + copy.
5. Load game, select Blender Test Vehicle, verify model appears and wheels steer.
6. Run `npm run blender:export` again while game running -> model reloads.
7. Invalid small file -> watcher skips, previous model preserved.