# Vehicle Physics

## Modes
- Arcade: forgiving, high grip, strong assist.
- Simulation: reduced grip, weight transfer, traction control, ABS, stability.

## Current model
Custom arcade physics with scalar speed, heading, steering angle. Not a full rigid-body simulation. Rapier investigation documented; not integrated yet.

## Planned
- @dimforge/rapier3d behind physics abstraction.
- Per-wheel raycast suspension.
- Tire friction curves.
- Fixed timestep + interpolation.