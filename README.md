<img height="480" alt="vroooooom" src="https://github.com/user-attachments/assets/096ccc6d-a745-4761-8d40-9d0950bde49c" />

# Aerodynamics Flight Simulator

A browser-based 3D flight simulator that combines real-time physics, aerodynamic visualization, and a responsive heads-up display. Fly with a keyboard or gamepad while switching between sensor views to see the forces around the aircraft.

![Aerodynamics Flight Simulator in action](https://github.com/user-attachments/assets/58373aa6-1fe2-415d-8721-1ae3643a8a21)

## Features

- A choice of aircraft — F-22 and F-16 — each with its own airframe and
  flight model
- A start screen over a live orbiting preview of the aircraft
- Physics-driven flight powered by Cannon.js, including angle of attack,
  sideslip, stalls, induced drag, and altitude-dependent air density
- Real-time 3D rendering with Three.js
- Airspeed, altitude, vertical speed, Mach, angle of attack, G-load, stall,
  throttle, and landing gear HUD readouts
- Twin afterburner plumes with shock diamonds above the throttle detent
- Thermal, laminar, velocity, and X-ray sensor views
- A marked runway north of the city to fly approaches to, with gear wheels
  that spin up on touchdown and free-wheel down after lift-off
- Adjustable wind visualization
- Keyboard and gamepad support

## Development

Install the pinned dependencies and start Vite:

```bash
npm ci
npm run dev
```

Vite prints the local URL to open in a modern browser. The simulator remains a
static application and the production output can be generated with `npm run build`.

Three.js and Cannon are pinned in `package.json` and bundled by Vite. They are
passed into `FlightSimulator` from `src/main.js`, so every module still receives
them by injection and stays testable with stand-ins.

Tailwind is compiled at build time by `@tailwindcss/vite` from `style.css`,
which points the scanner at `index.html` and `src` — the HUD assembles some
class strings in JavaScript, and those files have to be scanned for the
utilities to be emitted.

The page makes no external requests, so the simulator runs offline.

Run all formatting, lint, unit-test, and production-build checks with:

```bash
npm run check
```

Browser smoke tests use Playwright and run separately with `npm run test:e2e`.

## Starting

The simulator opens on a title screen with the controls, over a live view of
the aircraft parked above the city while the camera sweeps around it. Nothing is
simulated until **TAKE OFF** is pressed — no physics steps, no input — so the
flight always begins from the same state however long the screen is left up.

A page with no `#start-screen` element, such as an embedded or test document,
starts flying immediately.

## Aircraft

Pick one on the start screen; the preview swaps to it straight away. The choice
is fixed once the flight begins, because rebuilding mid-air would teleport you.

|                          | Character                                                |
| ------------------------ | -------------------------------------------------------- |
| **F-22 Raptor**          | Heavy, thrust-rich, twin canted fins.                    |
| **F-16 Fighting Falcon** | Light and single-engined. Rolls fastest, stalls soonest. |

Adding an aircraft means adding a file under `src/rendering/airframes/`, listing
it in `airframes/index.js`, and adding a button carrying its `data-airframe` id
to the start screen.

## Controls

### Keyboard

| Input               | Action                       |
| ------------------- | ---------------------------- |
| `W` / `S`           | Pitch down / up              |
| `A` / `D`           | Roll left / right            |
| `Q` / `E`           | Yaw left / right             |
| `Shift` / `Control` | Increase / decrease throttle |
| `G`                 | Toggle landing gear          |
| `P`                 | Pause / resume               |
| `R`                 | Reset the aircraft           |
| `H`                 | Show / hide the HUD panel    |

### Gamepad

| Input                | Action                       |
| -------------------- | ---------------------------- |
| Left stick           | Pitch and roll               |
| Right stick          | Orbit the camera             |
| Left / right bumper  | Yaw                          |
| Left / right trigger | Decrease / increase throttle |
| A / Cross            | Toggle landing gear          |
| B / Circle or Start  | Reset the aircraft           |

Resetting — whether from `R`, the gamepad, or a crash — flashes a message
across the HUD, so a building strike reads as a crash rather than an unexplained
teleport back to the start.

Keyboard and gamepad are read together every frame, so a connected controller
sitting at rest never takes the keyboard out of the loop.

The HUD controls carry their own state for assistive technology: the HUD button
reports `aria-expanded`, the sensor buttons report `aria-pressed`, the gamepad
line is a live region, and the on-screen reticle is hidden from screen readers
because it repeats the panel readouts. Keyboard focus draws a cyan ring, and the
UI transitions collapse under `prefers-reduced-motion`.

Use the **HUD** button to open flight data and visualization controls. Choose a sensor view or adjust wind opacity while you fly.

## Afterburner

Past the throttle detent in `AircraftConfig.js` (85% by default) the engines
light two exhaust plumes, each a bright core inside a longer outer cone with
drifting shock diamonds. The plume brightens and stretches with throttle and
spools rather than snapping on. It is purely visual: thrust is unchanged.

The plume colours are linear RGB triples rather than hex literals because
Three.js colour management converts hex through sRGB, which would darken them
before they reach the shader.

## Landing

The runway is laid out along the spawn heading, starting just past the northern
edge of the city, so flying straight ahead from a reset brings it into view. It
is scenery rather than its own collision surface — the ground body already spans
the world — and `RUNWAY_CONFIG` in `Runway.js` holds its size and markings.

Buildings are kept off the paving and out of the approach corridor leading up to
the near threshold: `buildCity` rerolls any site the runway reports as
obstructing, which keeps the city deterministic because the generator is seeded.

Touching down with the gear up, or with the gear down above 12 m/s of closing
speed or banked past about 37 degrees, still counts as a crash. Below that the
aircraft rolls out.

The gear wheels turn at ground speed while they are on the paving and
free-wheel down once airborne. Their materials are lifted clear of the ground
plane and carry a polygon offset as well: at kilometre range the depth buffer
resolves in metres, and a lift small enough to be invisible is not enough on its
own to keep the paving in front of the ground.

## Airframes

Each aircraft lives under `src/rendering/airframes/` as a `build` function for
the shapes that are its own, plus data for the parts every aircraft has —
stabilator and rudder hinges, gear positions, nozzle exits, collision shapes —
and its flight config. `AircraftModel` supplies the machinery around that:
hinging the control surfaces, animating them, building the physics body, and
running the flight model. Adding an aircraft means adding a file and listing it
in `airframes/index.js`.

## Aerodynamic model and units

The physics model uses SI units internally: metres (m), seconds (s), kilograms
(kg), newtons (N), pascals (Pa), and radians. HUD conversions are isolated in
`UnitConversions.js`; the deliberately rounded prototype display uses 2 knots
per m/s, 3 feet per metre, and 180 feet/minute per m/s.

Velocity is transformed into aircraft-local coordinates where **Z is forward, Y
is up, and X completes the right-handed frame by pointing out the left wing**
(Three.js and Cannon.js are right-handed, so a nose along `+z` with `+y` up puts
the right wing on `-x`). Angle of attack and sideslip are derived from that
velocity; positive sideslip means the airflow is pushing the aircraft toward its
left wing. Dynamic pressure is `q = 1/2 rho V²`, with density following an
exponential atmosphere (`rho = 1.225 exp(-altitude / 8500)`). Mach uses a
constant 343 m/s speed of sound.

The skyline is generated from a seeded generator in `Random.js`, so the city —
and every collision with it — is the same on every load. Pass a `random`
function or a `city` override to `Environment` to vary it.

Lift and profile drag coefficients are linearly interpolated from the tables in
`AircraftConfig.js`. Lift falls after the configured 15-degree stall angle;
induced drag is proportional to lift coefficient squared. Deployed gear adds
0.08 to drag coefficient. Aerodynamic forces act along the local airflow/lift
axes, sideslip produces a restoring side force, and control moments scale with
dynamic pressure. The fixed-step physics loop, fixed coefficient tables, and
absence of random inputs make a repeated initial state and input sequence
deterministic.
