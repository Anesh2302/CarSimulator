# AAA Vehicle Quality Upgrade

Status: planning and baseline audit
Base branch: master

This upgrade is delivered in independently testable phases. Existing gameplay systems must remain functional; do not mark a task complete until its acceptance checks pass.

## Baseline audit (source reviewed on 2026-11-05)

- The project is a Three.js + Vite browser simulator using a custom vehicle update loop.
- `src/vehicles/Car.js` currently uses a simplified longitudinal acceleration model and heading update. Steering is not a tire/suspension simulation; the current steering-factor expression cancels itself and has no effect. Collision checks test the vehicle center against expanded axis-aligned collider boxes rather than vehicle geometry or contact normals.
- `src/audio/AudioManager.js` generates engine layers from oscillators and tire/ambient noise from generated noise buffers. It does not currently demonstrate recorded engine samples, gear-change events, spatial audio, or Doppler processing.
- `src/world/World.js` builds a procedural grid city with box buildings, basic road planes, directional lighting, simple rain particles, and timed traffic lights.
- `src/assets/CarManifest.js` maps five vehicle GLBs plus the Blender test model.
- `TESTING.md` lists manual gameplay checks and a production build check. A passing build alone does not verify handling, sound, visuals, or frame-time targets.

## Phase 1 — Vehicle assets and presentation

- [ ] Inspect all five GLBs for scale, orientation, node naming, wheel pivots, materials, UVs, texture size, and missing assets.
- [ ] Verify four independently rotating wheels and front-wheel steering on every model.
- [ ] Improve model detail and physically based materials without changing manifest contracts unexpectedly.
- [ ] Add visual inspection captures for garage, exterior, cockpit, and night lighting.
- [ ] Validate GLB loading failures retain a safe fallback and do not create duplicate scene objects.

Acceptance: all five cars load, have correct proportions/materials, and pass wheel/steering inspection at runtime.

## Phase 2 — Vehicle dynamics

- [ ] Replace the no-op steering scaling with a documented speed-sensitive steering curve.
- [ ] Separate throttle, service brake, reverse, and handbrake behavior.
- [ ] Add a fixed-step or bounded substep simulation with stable delta-time handling.
- [ ] Implement per-vehicle mass, drivetrain response, tire grip, slip angle, lateral force, and load transfer appropriate to this browser simulator.
- [ ] Add suspension travel and wheel-ground response; avoid claiming full physical simulation unless validated.
- [ ] Replace center-point collision checks with oriented vehicle bounds/contact response and deterministic damage impulses.
- [ ] Tune and regression-test distinct handling profiles for Sport, SUV, Truck, Compact, and Racer.

Acceptance: repeatable acceleration, braking, cornering, low/high-speed steering, handbrake, collision, and reset tests for all five vehicles.

## Phase 3 — Audio

- [ ] Preserve Web Audio fallback and user-gesture initialization.
- [ ] Design RPM/load-based engine layers with smooth crossfades and gear-change events.
- [ ] Add optional licensed engine recordings only when the project has documented rights; otherwise clearly label synthesized audio.
- [ ] Drive tire squeal from estimated tire slip rather than steering angle alone.
- [ ] Add impact intensity, surface/road noise, exhaust/turbo cues where supported, and interior/exterior filtering.
- [ ] Add spatial positioning and Doppler only where the scene/audio architecture supports reliable listener/source transforms.
- [ ] Verify all settings volumes, mute behavior, lifecycle cleanup, and no audio-node leaks.

Acceptance: audible and measurable behavior changes with RPM, throttle, gear, slip, impact, camera/listener position, and settings; no clipping or runaway nodes.

## Phase 4 — World and graphics

- [ ] Improve road surfaces, markings, sidewalks, building variation, and environmental set dressing.
- [ ] Improve paint, glass, rubber, metal, lights, reflections, shadows, and tone mapping.
- [ ] Improve weather transitions, wet-road response, rain presentation, fog, and day/night lighting.
- [ ] Add exhaust, tire smoke, dust, and collision particles with bounded particle counts.
- [ ] Verify accessibility and graphics-quality settings actually change rendering cost and appearance.

Acceptance: visual review in daylight, night, rain, fog, and all supported camera modes; no missing assets or major rendering artifacts.

## Phase 5 — Performance, accessibility, and QA

- [ ] Establish baseline FPS/frame-time and memory measurements on representative desktop hardware.
- [ ] Profile draw calls, shadows, geometry, texture memory, audio nodes, and update-loop allocations.
- [ ] Add frustum/LOD or instancing where profiling demonstrates benefit.
- [ ] Test keyboard, touch, gamepad, resize, pause/resume, reload, and save/load.
- [ ] Run production build and browser smoke tests after each phase.
- [ ] Record test evidence and known limitations; do not report unrun tests as passing.

Acceptance: stable frame-time target documented for test hardware, no new console errors, build passes, and all manual regression cases pass.

## Delivery rules

1. Work on this branch; do not force-push or overwrite unrelated work.
2. Keep changes small and phase-scoped.
3. Preserve existing controls, game modes, save data, and fallback assets.
4. Record tests actually run and their results in each pull request.
5. Do not use "AAA", "realistic", or "complete" as a completion claim without evidence.
