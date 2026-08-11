export class Renderer {
  constructor({ THREE, window, container }) {
    this.THREE = THREE;
    this.window = window;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5000,
    );
    this.camera.position.set(0, 158, -25);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.resize();
    container?.appendChild(this.renderer.domElement);
  }

  resize() {
    this.camera.aspect = this.window.innerWidth / this.window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.window.innerWidth, this.window.innerHeight);
    this.renderer.setPixelRatio(this.window.devicePixelRatio);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
