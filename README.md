# Aerodynamics Flight Simulator

A browser-based 3D flight simulator that combines real-time physics, aerodynamic visualization, and a responsive heads-up display. Fly with a keyboard or gamepad while switching between sensor views to see the forces around the aircraft.

![Aerodynamics Flight Simulator in action](https://github.com/user-attachments/assets/2f570027-c112-42c7-bbc6-29b65b869714)

## Features

- Physics-driven flight powered by Cannon.js, including angle of attack,
  sideslip, stalls, induced drag, and altitude-dependent air density
- Real-time 3D rendering with Three.js
- Airspeed, altitude, vertical speed, Mach, angle of attack, G-load, stall,
  throttle, and landing gear HUD readouts
- Thermal, laminar, velocity, and X-ray sensor views
- Adjustable wind visualization
- Keyboard and gamepad support

## Development

Install the pinned development dependencies and start Vite:

```bash
npm ci
npm run dev
```

Vite prints the local URL to open in a modern browser. The simulator remains a
static application and the production output can be generated with `npm run build`.

> The simulator loads Tailwind CSS, Three.js, and Cannon.js from CDNs, so an internet connection is required.

Run all formatting, lint, unit-test, and production-build checks with:

```bash
npm run check
```

Browser smoke tests use Playwright and run separately with `npm run test:e2e`.

## Controls

### Keyboard

| Input               | Action                       |
| ------------------- | ---------------------------- |
| `W` / `S`           | Pitch down / up              |
| `A` / `D`           | Roll left / right            |
| `Q` / `E`           | Yaw left / right             |
| `Shift` / `Control` | Increase / decrease throttle |
| `G`                 | Toggle landing gear          |

### Gamepad

| Input                | Action                       |
| -------------------- | ---------------------------- |
| Left stick           | Pitch and roll               |
| Right stick          | Orbit the camera             |
| Left / right bumper  | Yaw                          |
| Left / right trigger | Decrease / increase throttle |
| A / Cross            | Toggle landing gear          |
| B / Circle or Start  | Reset the aircraft           |

Use the **HUD** button to open flight data and visualization controls. Choose a sensor view or adjust wind opacity while you fly.

## Aerodynamic model and units

The physics model uses SI units internally: metres (m), seconds (s), kilograms
(kg), newtons (N), pascals (Pa), and radians. HUD conversions are isolated in
`UnitConversions.js`; the deliberately rounded prototype display uses 2 knots
per m/s, 3 feet per metre, and 180 feet/minute per m/s.

Velocity is transformed into aircraft-local coordinates where **X is right, Y
is up, and Z is forward**. Angle of attack and sideslip are derived from that
velocity. Dynamic pressure is `q = 1/2 rho V²`, with density following an
exponential atmosphere (`rho = 1.225 exp(-altitude / 8500)`). Mach uses a
constant 343 m/s speed of sound.

Lift and profile drag coefficients are linearly interpolated from the tables in
`AircraftConfig.js`. Lift falls after the configured 15-degree stall angle;
induced drag is proportional to lift coefficient squared. Deployed gear adds
0.08 to drag coefficient. Aerodynamic forces act along the local airflow/lift
axes, sideslip produces a restoring side force, and control moments scale with
dynamic pressure. The fixed-step physics loop, fixed coefficient tables, and
absence of random inputs make a repeated initial state and input sequence
deterministic.
