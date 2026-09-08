import { createSeededRandom } from "../utils/Random.js";

export const CITY_CONFIG = Object.freeze({
  seed: 20240517,
  blockCount: 1000,
  blockHeight: 100,
  blockWidth: 20,
  spread: 4000,
});

export class Environment {
  constructor(
    scene,
    physicsWorld,
    physicsMaterial,
    { THREE, CANNON, random, city = CITY_CONFIG },
  ) {
    this.THREE = THREE;
    this.CANNON = CANNON;
    this.scene = scene;
    this.world = physicsWorld;
    this.physicsMaterial = physicsMaterial;
    this.city = city;
    // Seeded by default so the skyline — and therefore every collision with
    // it — replays identically from one run to the next.
    this.random = random ?? createSeededRandom(city.seed);
    this.buildLighting();
    this.buildGround();
    this.buildCity();
  }
  buildLighting() {
    this.scene.background = new this.THREE.Color(0x5dade2);
    this.scene.add(new this.THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new this.THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(200, 500, 300);
    this.scene.add(dirLight);

    const fillLight = new this.THREE.DirectionalLight(0x5dade2, 0.5);
    fillLight.position.set(-100, -50, -100);
    this.scene.add(fillLight);
  }
  buildGround() {
    const groundMat = new this.THREE.MeshStandardMaterial({
      color: 0x3b7a57,
      roughness: 0.9,
    });
    const ground = new this.THREE.Mesh(
      new this.THREE.PlaneGeometry(20000, 20000),
      groundMat,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    this.scene.add(ground);

    const groundBody = new this.CANNON.Body({
      mass: 0,
      material: this.physicsMaterial,
    });
    groundBody.addShape(new this.CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(
      new this.CANNON.Vec3(1, 0, 0),
      -Math.PI / 2,
    );
    groundBody.position.set(0, -2, 0);
    groundBody.isGround = true;
    this.world.addBody(groundBody);

    const gridHelper = new this.THREE.GridHelper(
      10000,
      500,
      0xffffff,
      0xaaaaaa,
    );
    gridHelper.position.y = 0.1;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.5;
    this.scene.add(gridHelper);
  }
  buildCity({ blockCount, blockHeight, blockWidth, spread } = this.city) {
    const blockGeo = new this.THREE.BoxGeometry(
      blockWidth,
      blockHeight,
      blockWidth,
    );
    const blockMat = new this.THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.8,
    });
    const blockShape = new this.CANNON.Box(
      new this.CANNON.Vec3(blockWidth / 2, blockHeight / 2, blockWidth / 2),
    );

    // Every block shares one geometry and material, so they draw as a single
    // instanced mesh instead of a thousand separate draw calls per frame.
    this.cityBlocks = new this.THREE.InstancedMesh(
      blockGeo,
      blockMat,
      blockCount,
    );
    // Frustum culling tests the geometry's bounding sphere, which describes a
    // single block at the origin rather than the 4 km field the instances are
    // spread over, so the whole city would blink out whenever that one block
    // left the view. One draw call is cheap enough to always submit.
    this.cityBlocks.frustumCulled = false;
    const transform = new this.THREE.Matrix4();

    for (let i = 0; i < blockCount; i++) {
      const x = (this.random() - 0.5) * spread;
      const y = blockHeight / 2;
      const z = (this.random() - 0.5) * spread;

      this.cityBlocks.setMatrixAt(i, transform.makeTranslation(x, y, z));

      const blockBody = new this.CANNON.Body({
        mass: 0,
        material: this.physicsMaterial,
      });
      blockBody.addShape(blockShape);
      blockBody.position.set(x, y, z);
      blockBody.isBuilding = true;
      this.world.addBody(blockBody);
    }

    this.cityBlocks.instanceMatrix.needsUpdate = true;
    this.scene.add(this.cityBlocks);
  }
}
