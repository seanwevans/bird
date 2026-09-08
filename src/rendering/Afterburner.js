export const AFTERBURNER_CONFIG = Object.freeze({
  /** Nozzle exits in body coordinates: z forward, y up, +x out the left wing. */
  nozzles: Object.freeze([
    Object.freeze({ x: 0.8, y: -0.05, z: -10.25 }),
    Object.freeze({ x: -0.8, y: -0.05, z: -10.25 }),
  ]),
  /** Bright inner core, then the long outer plume it sits inside. Colours are
   * linear RGB triples rather than hex so they are not run through Three.js
   * colour management, which would darken them before they reach the shader. */
  cones: Object.freeze([
    Object.freeze({
      radius: 0.34,
      length: 2.6,
      near: Object.freeze([0.9, 0.97, 1]),
      far: Object.freeze([0.25, 0.65, 1]),
      shocks: 22,
      strength: 1,
    }),
    Object.freeze({
      radius: 0.46,
      length: 6.4,
      near: Object.freeze([0.55, 0.72, 1]),
      far: Object.freeze([0.55, 0.12, 1]),
      shocks: 11,
      strength: 0.7,
    }),
  ]),
  /** Plume length at threshold, growing to full length at maximum throttle. */
  minimumStretch: 0.45,
  flickerRate: 41,
  shockDriftRate: 7,
});

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Cone UVs run 0 at the base, which sits on the nozzle, to 1 at the tip.
const FRAGMENT_SHADER = `
  uniform float intensity;
  uniform float time;
  uniform vec3 nearColor;
  uniform vec3 farColor;
  uniform float shocks;
  uniform float strength;
  uniform float flickerRate;
  uniform float shockDriftRate;
  varying vec2 vUv;

  void main() {
    float along = vUv.y;
    // Standing shock diamonds drifting slowly aft.
    float diamonds = 0.5 + 0.5 * sin(along * shocks - time * shockDriftRate);
    float flicker = 0.9 + 0.1 * sin(time * flickerRate + vUv.x * 17.0);
    float taper = 1.0 - along;
    // A hard hot root just aft of the nozzle over a longer, softer plume.
    float root = pow(taper, 3.0);
    float body = pow(taper, 0.9);
    vec3 color = mix(nearColor, farColor, pow(along, 0.45));
    float alpha =
      (body * (0.35 + 0.65 * diamonds) + root * 0.9) *
      strength *
      intensity *
      flicker;
    // The plume has to read as hot against a bright sky, so it is deliberately
    // overdriven and left to clip towards white at the core.
    gl_FragColor = vec4(color * (1.5 + 0.8 * diamonds), min(alpha, 1.0));
  }
`;

/** Exhaust plumes that light up when the throttle passes the afterburner
 * detent. Purely visual: thrust itself is unchanged. */
export class Afterburner {
  constructor(jetGroup, { THREE, config = AFTERBURNER_CONFIG }) {
    this.THREE = THREE;
    this.config = config;
    this.intensity = 0;
    this.uniforms = { time: { value: 0 }, intensity: { value: 0 } };
    this.plumes = config.nozzles.map((nozzle) => this.buildPlume(nozzle));
    for (const plume of this.plumes) jetGroup.add(plume);
  }

  buildPlume({ x, y, z }) {
    const plume = new this.THREE.Group();
    plume.position.set(x, y, z);
    plume.visible = false;

    for (const cone of this.config.cones) {
      const mesh = new this.THREE.Mesh(
        new this.THREE.ConeGeometry(cone.radius, cone.length, 16, 1, true),
        this.buildMaterial(cone),
      );
      // Cones are built along +y; lay the apex aft so the base caps the nozzle.
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.z = -cone.length / 2;
      plume.add(mesh);
    }

    return plume;
  }

  buildMaterial({ near, far, shocks, strength }) {
    return new this.THREE.ShaderMaterial({
      uniforms: {
        ...this.uniforms,
        nearColor: { value: new this.THREE.Color(...near) },
        farColor: { value: new this.THREE.Color(...far) },
        shocks: { value: shocks },
        strength: { value: strength },
        flickerRate: { value: this.config.flickerRate },
        shockDriftRate: { value: this.config.shockDriftRate },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: this.THREE.DoubleSide,
      blending: this.THREE.AdditiveBlending,
    });
  }

  /** `intensity` is 0 below the afterburner threshold and 1 at full throttle. */
  update(intensity, deltaTime = 1 / 60) {
    this.intensity = intensity;
    this.uniforms.intensity.value = intensity;
    this.uniforms.time.value += deltaTime;

    const { minimumStretch } = this.config;
    const stretch = minimumStretch + (1 - minimumStretch) * intensity;
    for (const plume of this.plumes) {
      plume.visible = intensity > 0.001;
      plume.scale.set(1, 1, stretch);
    }
  }
}
