# Aerodynamics Flight Simulator

A browser-based 3D flight simulator that combines real-time physics, aerodynamic visualization, and a responsive heads-up display. Fly with a keyboard or gamepad while switching between sensor views to see the forces around the aircraft.

![Aerodynamics Flight Simulator in action](https://github.com/user-attachments/assets/2f570027-c112-42c7-bbc6-29b65b869714)

## Features

- Physics-driven flight powered by Cannon.js
- Real-time 3D rendering with Three.js
- Airspeed, altitude, vertical speed, Mach, throttle, angle of attack, G-load, stall, and landing gear HUD readouts
- Local-airflow lift, induced/profile drag, sideslip force, and dynamic-pressure control authority
- Predictable stall/post-stall lift curves, altitude-dependent density, and deployable-gear drag
- Compound fuselage, wing, tail, and landing-gear collision body
- Thermal, laminar, velocity, and X-ray sensor views
- Adjustable wind visualization
- Keyboard and gamepad support

## Run locally

No build step is required. Start a local web server from the project directory:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a modern browser.

> The simulator loads Tailwind CSS, Three.js, and Cannon.js from CDNs, so an internet connection is required.

## Controls

### Keyboard

| Input | Action |
| --- | --- |
| `W` / `S` | Pitch down / up |
| `A` / `D` | Roll left / right |
| `Q` / `E` | Yaw left / right |
| `Shift` / `Control` | Increase / decrease throttle |
| `G` | Toggle landing gear |

### Gamepad

| Input | Action |
| --- | --- |
| Left stick | Pitch and roll |
| Right stick | Orbit the camera |
| Left / right bumper | Yaw |
| Left / right trigger | Decrease / increase throttle |
| A / Cross | Toggle landing gear |
| B / Circle or Start | Reset the aircraft |

Use the **HUD** button to open flight data and visualization controls. Choose a sensor view or adjust wind opacity while you fly.

## Aerodynamic model and units

The simulation uses SI internally: distance and altitude are metres (`m`), time is seconds (`s`), velocity is metres per second (`m/s`), mass is kilograms (`kg`), force is newtons (`N`), torque is newton-metres (`N·m`), angles are radians, and density is kilograms per cubic metre (`kg/m³`). The HUD converts speed using `1 m/s = 1.94384 kt`, altitude using `1 m = 3.28084 ft`, and vertical speed using `1 m/s = 196.8504 ft/min`. Standard gravity for load-factor calculations is `9.80665 m/s²`.

Aircraft-relative velocity is transformed into the local axes: **+X right, +Y up, +Z forward**. Angle of attack is `atan2(-local vertical velocity, local forward velocity)`, sideslip is `atan2(local lateral velocity, local forward velocity)`, and dynamic pressure is `q = ½ρV²`. Density follows `ρ = 1.225 exp(-altitude / 8500)`, a simple tropospheric exponential approximation. Mach uses a constant `343 m/s` speed of sound.

Lift and base drag coefficients are piecewise-linear configurable curves in `Jet.aero`. Lift peaks at ±16°; beyond that stall boundary the curve deliberately loses lift toward its post-stall values. Total drag combines profile drag, induced drag proportional to `CL²`, and `0.12` additional drag coefficient while the gear is down. Control torque scales with dynamic pressure rather than speed. The HUD load factor is local aerodynamic vertical force divided by aircraft weight; `STALL` indicates that absolute angle of attack is at or beyond 16°.

The physics world advances in fixed `1/60 s` steps. The city layout uses a fixed-seed generator, so an identical initial state and frame-by-frame input sequence produces the same physics trajectory. Visual wind particles do not feed forces back into the aircraft.
