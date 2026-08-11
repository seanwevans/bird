export class Renderer {
  constructor({ THREE, window, document }) {
    this.THREE = THREE; this.window = window;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.camera.position.set(0, 158, -25);
    this.webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.resize();
    this.webgl.setPixelRatio(window.devicePixelRatio);
    document.getElementById("canvas-container")?.appendChild(this.webgl.domElement);
    window.addEventListener("resize", () => this.resize());
  }
  resize() { this.camera.aspect = this.window.innerWidth / this.window.innerHeight; this.camera.updateProjectionMatrix(); this.webgl.setSize(this.window.innerWidth, this.window.innerHeight); }
  updateCamera(group, orbitYaw, orbitPitch) {
    const T = this.THREE;
    const offset = new T.Vector3(0, 8, -25).applyQuaternion(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), orbitPitch)).applyQuaternion(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), orbitYaw)).applyQuaternion(group.quaternion);
    this.camera.position.lerp(group.position.clone().add(offset), 0.1);
    const target = new T.Vector3(0, 0, 20).applyQuaternion(group.quaternion).add(group.position);
    this.camera.up.lerp(new T.Vector3(0, 1, 0).applyQuaternion(group.quaternion), 0.1);
    this.camera.lookAt(target);
  }
  render() { this.webgl.render(this.scene, this.camera); }
}
