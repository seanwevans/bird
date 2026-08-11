export class WindVisualization {
  constructor({ THREE, aircraftGroup }) {
    this.THREE = THREE;
    this.particleCount = 4000;
    this.baseTailLength = 4.0;
    this.TUNNEL_RADIUS = 15;
    this.PARTICLE_START_Z = 35;
    this.PARTICLE_END_Z = -35;

    this.originalX = [];
    this.originalY = [];

    this.buildGeometry(aircraftGroup);
  }
  buildGeometry(jetGroup) {
    this.lineGeometry = new this.THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 2 * 3);
    const particleColors = new Float32Array(this.particleCount * 2 * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const r = this.TUNNEL_RADIUS * 0.95 * Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const z =
        this.PARTICLE_START_Z -
        Math.random() * (this.PARTICLE_START_Z - this.PARTICLE_END_Z);

      this.originalX[i] = x;
      this.originalY[i] = y;

      const idx = i * 6;
      this.particlePositions[idx] = x;
      this.particlePositions[idx + 1] = y;
      this.particlePositions[idx + 2] = z;
      this.particlePositions[idx + 3] = x;
      this.particlePositions[idx + 4] = y;
      this.particlePositions[idx + 5] = z + this.baseTailLength;

      particleColors[idx] = 0.0;
      particleColors[idx + 1] = 1.0;
      particleColors[idx + 2] = 1.0;
      particleColors[idx + 3] = 0.0;
      particleColors[idx + 4] = 1.0;
      particleColors[idx + 5] = 1.0;
    }

    this.lineGeometry.setAttribute(
      "position",
      new this.THREE.BufferAttribute(this.particlePositions, 3)
    );
    this.lineGeometry.setAttribute(
      "color",
      new this.THREE.BufferAttribute(particleColors, 3)
    );

    const material = new this.THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: this.THREE.AdditiveBlending,
      depthWrite: false
    });

    this.windParticles = new this.THREE.LineSegments(this.lineGeometry, material);
    jetGroup.add(this.windParticles);
  }
  update(velocityMag, simulatedMach, userOpacity, viewMode) {
    this.windParticles.material.opacity =
      Math.min(1.0, velocityMag * 0.02) * userOpacity;
    if (velocityMag < 5) return;

    const windFlowSpeed = velocityMag * 0.03;
    const tailLength = this.baseTailLength + velocityMag * 0.05;
    const colors = this.lineGeometry.attributes.color.array;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 6;
      let px = this.particlePositions[idx];
      let py = this.particlePositions[idx + 1];
      let pz = this.particlePositions[idx + 2];
      pz -= windFlowSpeed;

      let stress = 0;
      const fV =
        (px * px) / (2.8 * 2.8) +
        (py * py) / (2.8 * 2.8) +
        (pz * pz) / (12.0 * 12.0);
      const wZ = pz + 1.0;
      const wV =
        (px * px) / (10.0 * 10.0) +
        (py * py) / (1.8 * 1.8) +
        (wZ * wZ) / (5.5 * 5.5);
      const tY = py - 1.5;
      const tZ = pz + 4.5;
      const tV =
        (px * px) / (1.5 * 1.5) +
        (tY * tY) / (4.5 * 4.5) +
        (tZ * tZ) / (5.0 * 5.0);
      const minV = Math.min(fV, wV, tV);

      if (minV < 1.8) {
        let nx = 0,
          ny = 0,
          nz = 0;
        if (minV === fV) {
          nx = (2 * px) / (2.8 * 2.8);
          ny = (2 * py) / (2.8 * 2.8);
          nz = (2 * pz) / (12.0 * 12.0);
        } else if (minV === wV) {
          nx = (2 * px) / (10.0 * 10.0);
          ny = (2 * py) / (1.8 * 1.8);
          nz = (2 * wZ) / (5.5 * 5.5);
        } else {
          nx = (2 * px) / (1.5 * 1.5);
          ny = (2 * tY) / (4.5 * 4.5);
          nz = (2 * tZ) / (5.0 * 5.0);
        }

        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (nLen > 0.001) {
          nx /= nLen;
          ny /= nLen;
          nz /= nLen;
        }

        const pushFactor = (1.8 - minV) * 1.2;
        px += nx * pushFactor;
        py += ny * pushFactor;
        pz += nz * pushFactor * 0.15;
        stress = Math.min(1.0, pushFactor * 1.5);
      } else {
        px += (this.originalX[i] - px) * 0.015;
        py += (this.originalY[i] - py) * 0.015;
        if (pz < -6.0 && pz > -25.0) {
          px += Math.sin(pz * 0.5 + i) * 0.03 * simulatedMach;
          py += Math.cos(pz * 0.4 - i) * 0.03 * simulatedMach;
        }
      }

      if (pz < this.PARTICLE_END_Z) {
        pz = this.PARTICLE_START_Z + Math.random() * 5;
        px = this.originalX[i];
        py = this.originalY[i];
      }

      this.particlePositions[idx] = px;
      this.particlePositions[idx + 1] = py;
      this.particlePositions[idx + 2] = pz;
      this.particlePositions[idx + 3] = px;
      this.particlePositions[idx + 4] = py;
      this.particlePositions[idx + 5] = pz + tailLength;

      let r = 0,
        g = 1,
        b = 1;
      if (viewMode === 0 && stress > 0.01) {
        if (stress < 0.5) {
          const t = stress * 2.0;
          r = t;
          g = 1.0;
          b = 1.0 - t;
        } else {
          const t = (stress - 0.5) * 2.0;
          r = 1.0;
          g = 1.0 - t;
          b = 0.0;
        }
      } else if (viewMode === 1) {
        r = 0.0;
        g = 0.8;
        b = 1.0;
      } else if (viewMode === 2) {
        const v = Math.min(1.0, simulatedMach * 0.4 + stress);
        r = v;
        g = 1.0 - v * 0.5;
        b = 1.0;
      } else if (viewMode === 3) {
        const v = Math.min(1.0, stress * 1.5);
        r = v * 0.5;
        g = 1.0;
        b = v * 0.2;
      }

      colors[idx] = r;
      colors[idx + 1] = g;
      colors[idx + 2] = b;
      colors[idx + 3] = r;
      colors[idx + 4] = g;
      colors[idx + 5] = b;
    }

    this.lineGeometry.attributes.position.needsUpdate = true;
    this.lineGeometry.attributes.color.needsUpdate = true;
  }
}

