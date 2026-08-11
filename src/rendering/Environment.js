export class Environment {
  constructor(scene, physicsWorld, physicsMaterial, { THREE, CANNON }) {
    this.THREE = THREE;
    this.CANNON = CANNON;
    this.scene = scene;
    this.world = physicsWorld;
    this.physicsMaterial = physicsMaterial;
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
  buildCity(height = 100) {
    const blockGeo = new this.THREE.BoxGeometry(20, height, 20);
    const blockMat = new this.THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.8,
    });
    const blockShape = new this.CANNON.Box(
      new this.CANNON.Vec3(10, height / 2, 10),
    );

    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 4000;
      const y = 50;
      const z = (Math.random() - 0.5) * 4000;

      const block = new this.THREE.Mesh(blockGeo, blockMat);
      block.position.set(x, y, z);
      this.scene.add(block);

      const blockBody = new this.CANNON.Body({
        mass: 0,
        material: this.physicsMaterial,
      });
      blockBody.addShape(blockShape);
      blockBody.position.set(x, y, z);
      blockBody.isBuilding = true;
      this.world.addBody(blockBody);
    }
  }
}
