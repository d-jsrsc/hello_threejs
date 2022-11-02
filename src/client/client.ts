import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import { GUI } from "dat.gui";

const scene = new THREE.Scene();
scene.add(new THREE.AxesHelper(5));

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 10;
camera.position.x = 10;
camera.position.y = 10;
// camera.lookAt(new THREE.Vector3(10, 0, 0));

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
// controls.addEventListener("change", render);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({
  color: "#00ff00",
  wireframe: true,
});

const cube = new THREE.Mesh(geometry, material);
// cube.parent
scene.add(cube);

const stats = Stats();
document.body.appendChild(stats.dom);

const gui = new GUI();
const cubeFolder = gui.addFolder("Cube");
{
  const cubeRotationFolder = cubeFolder.addFolder("Rotation");
  cubeRotationFolder.add(cube.rotation, "x", 0, Math.PI * 2);
  cubeRotationFolder.add(cube.rotation, "y", 0, Math.PI * 2);
  cubeRotationFolder.add(cube.rotation, "z", 0, Math.PI * 2);
  cubeRotationFolder.open();

  const cubePositionFolder = cubeFolder.addFolder("Position");
  cubePositionFolder.add(cube.position, "x", -10, 10, 2);
  cubePositionFolder.add(cube.position, "y", -10, 10, 2);
  cubePositionFolder.add(cube.position, "z", -10, 10, 2);
  cubePositionFolder.open();

  const cubeScaleFolder = cubeFolder.addFolder("Scale");
  cubeScaleFolder.add(cube.scale, "x", -5, 5);
  cubeScaleFolder.add(cube.scale, "y", -5, 5);
  cubeScaleFolder.add(cube.scale, "z", -5, 5);
  cubeScaleFolder.open();
}
cubeFolder.add(cube, "visible");
cubeFolder.open();

const cameraFolder = gui.addFolder("Camera");
cameraFolder.add(camera.position, "z", 0, 10);
cameraFolder.open();

window.addEventListener("resize", onWindowResize, false);
animate();
// render();

function render() {
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);

  cube.rotation.x += 0.01;
  //   cube.rotation.y += 0.01;

  render();

  stats.update();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}
