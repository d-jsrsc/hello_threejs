import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import {
  BufferGeometry,
  Camera,
  Color,
  TextureFilter,
  Vector2,
  Vector3,
} from "three";
import lineVertexShader from "./vertexShader";
import lineFragmentShader from "./fragmentShader";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { degToRad, radToDeg } from "three/src/math/MathUtils";

const canvas = document.querySelector("canvas.webgl") as HTMLElement;

// Scene
const scene = new THREE.Scene();
var fogColor = new THREE.Color("black");
scene.background = fogColor;

let matrix: Array<number> = [];
let lines: any = []; // TODO
let destroyLines = false;
var fps: number[] = [];
let criticalFPS = 0;

/**
 * GAME LOOP GAME LOOP GAME LOOP GAME LOOP GAME LOOP GAME LOOP
 */
const clock = new THREE.Clock(true);
let elapsedTime = 0;
let deltaTime = 0;
let timeModifier = 1;
let count = 0;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const cameraParams: any = {
  lockHeight: 0.8,
  lockFOV: 30,
  lockRadius: 35,
  lookHeight: 8,
  lockPlanetHeight: 11.0,
  lockOffsetTime: 2.8,
  defaultLook: new THREE.Vector3(0, -3, 0),
  defaultHeight: 35,
  defaultZ: 90,
  defaultFOV: 20,
  startPositionLenght: null,
  blackHoleLookHeight: 10,
  blackHoleLockHeight: 15,
};
const animationParams: any = {
  planetScale: 1,
  ringScale: 1,
  blackHoleY: 0,
  spiralSize: 0,
};
const mouse = new THREE.Vector2();
let currentIntersect = null;
let lockedOnPlanet: any = null;
let previousLockedPlanet: any = null;
let latestClickedObject = null;
let newClick = false;

const pointsOfInterest = [
  {
    element: document.querySelector(".point-0"),
  },
];

const textureLoader = new THREE.TextureLoader();
const labelPolygon = textureLoader.load("./textures/labels/labelPolygon.png");
const matcapTexturePlanetPOLY = textureLoader.load(
  "./textures/matcaps/matPOLY.png"
);
// matcapTexturePlanetPOLY.mipmaps = []

const camera = new THREE.PerspectiveCamera(
  cameraParams.defaultFOV,
  sizes.width / sizes.height,
  0.1,
  500
);
camera.position.x = 0;
camera.position.y = cameraParams.defaultHeight;
camera.position.z = cameraParams.defaultZ;
cameraParams.startPositionLenght = camera.position.length();
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target = cameraParams.defaultLook;
controls.enableDamping = true;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI - 0.08;
controls.enablePan = false;
controls.dampingFactor = 0.04;
controls.zoomSpeed = 0.4;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas!,
  antialias: false,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const textureMoon = textureLoader.load("./textures/maps/moon.jpg");
const matcapTexturePlanetETH = textureLoader.load(
  "./textures/matcaps/matETH.png"
);
const matcapTexturePlanetSOL = textureLoader.load(
  "./textures/matcaps/matSOL.png"
);
const matcapTexturePlanetBNB = textureLoader.load(
  "./textures/matcaps/matBNB.png"
);
const matcapTexturePlanetAVAX = textureLoader.load(
  "./textures/matcaps/matAVAX.png"
);
const matcapTexturePlanetFTM = textureLoader.load(
  "./textures/matcaps/matFTM.png"
);
const matcapTexturePlanetLINK = textureLoader.load(
  "./textures/matcaps/matLINK.png"
);
const labelAvalanche = textureLoader.load(
  "./textures/labels/labelAvalanche.png"
);
const labelBinance = textureLoader.load("./textures/labels/labelBinance.png");
const labelEthereum = textureLoader.load("./textures/labels/labelEthereum.png");
const labelFantom = textureLoader.load("./textures/labels/labelFantom.png");
const labelSolana = textureLoader.load("./textures/labels/labelSolana.png");
const labelChainlink = textureLoader.load(
  "./textures/labels/labelChainlink.png"
);
const blackHoleGlow = textureLoader.load("./textures/maps/2dglow001.png");
const blackHoleRingTex = textureLoader.load(
  "./textures/maps/blackhole-ring008.png"
);
const texture = textureLoader.load(
  "./textures/environment/sxt-environment-005.png",
  () => {
    const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
    rt.fromEquirectangularTexture(renderer, texture);
    scene.background = rt.texture;
  }
);

const planetList: any = {
  planet0: {
    index: 15,
    size: 0.05 * 0.7,
    orbitRadius: 0.21 * 0.7,
    orbitSpeed: 0.115,
    orbitHeight: -1.8,
    orbitOffset: -0.5,
    density: 2.5,
    material: null,
    geometry: null,
    object: null,
    moonQuantity: 4,
    moonObjects: [],
    matcap: matcapTexturePlanetPOLY,
    label: labelPolygon,
    labelObject: null,
    originalHeight: 0,
    posX: 0,
    posZ: 0,
    ignoreField: false,
    insideColor: new THREE.Color("#A792E6"),
    outsideColor: new THREE.Color("#4F34A4"),
  },
  planet1: {
    index: 25,
    size: 0.04 * 0.7,
    orbitRadius: 0.45 * 0.7,
    orbitSpeed: 0.09,
    orbitHeight: -1.2,
    orbitOffset: 3,
    density: 2.5,
    material: null,
    geometry: null,
    object: null,
    moonQuantity: 4,
    moonObjects: [],
    matcap: matcapTexturePlanetFTM,
    label: labelFantom,
    labelObject: null,
    originalHeight: 0,
    posX: 0,
    posZ: 0,
    ignoreField: true,
    insideColor: new THREE.Color("#699DE2"),
    outsideColor: new THREE.Color("#173FAD"),
  },
  planet2: {
    index: 20,
    size: 0.045 * 0.7,
    orbitRadius: 0.3 * 0.7,
    orbitSpeed: 0.06,
    orbitHeight: -0.6,
    orbitOffset: 7,
    density: 2.5,
    material: null,
    geometry: null,
    object: null,
    moonQuantity: 4,
    moonObjects: [],
    matcap: matcapTexturePlanetAVAX,
    label: labelAvalanche,
    labelObject: null,
    originalHeight: 0,
    posX: 0,
    posZ: 0,
    ignoreField: false,
    insideColor: new THREE.Color("#CC3333"),
    outsideColor: new THREE.Color("#CC3333"),
  },
  planet3: {
    index: 0,
    size: 0.075 * 0.7,
    orbitRadius: 0.3 * 0.7,
    orbitSpeed: 0.06,
    orbitHeight: -0.5,
    orbitOffset: 2,
    density: 3.75,
    material: null,
    geometry: null,
    object: null,
    moonQuantity: 4,
    moonObjects: [],
    matcap: matcapTexturePlanetETH,
    label: labelEthereum,
    labelObject: null,
    originalHeight: 0,
    ignoreField: false,
    insideColor: new THREE.Color("#281660"),
    outsideColor: new THREE.Color("#4387AE"),
  },
  planet4: {
    index: 5,
    size: 0.065 * 0.7,
    orbitRadius: 0.34 * 0.7,
    orbitSpeed: 0.06,
    orbitHeight: 0.0,
    orbitOffset: 4,
    density: 5.0,
    material: null,
    geometry: null,
    object: null,
    moonQuantity: 4,
    moonObjects: [],
    matcap: matcapTexturePlanetSOL,
    label: labelSolana,
    labelObject: null,
    originalHeight: 0,
    posX: 0,
    posZ: 0,
    ignoreField: false,
    insideColor: new THREE.Color("#2C6060"),
    outsideColor: new THREE.Color("#281660"),
  },
  planet5: {
    index: 10,
    size: 0.055 * 0.7,
    orbitRadius: 0.35 * 0.7,
    orbitSpeed: 0.06,
    orbitHeight: -0.3,
    orbitOffset: 5,
    density: 2.5,
    material: null,
    geometry: null,
    object: null,
    moonQuantity: 4,
    moonObjects: [],
    matcap: matcapTexturePlanetBNB,
    label: labelBinance,
    labelObject: null,
    originalHeight: 0,
    posX: 0,
    posZ: 0,
    ignoreField: false,
    insideColor: new THREE.Color("#C97C3C"),
    outsideColor: new THREE.Color("#E3AF74"),
  },
  planet6: {
    index: 30,
    size: 0.045 * 0.7,
    orbitRadius: 0.15 * 0.7,
    orbitSpeed: 0.3,
    orbitHeight: -2.5,
    orbitOffset: 5,
    density: 2.5,
    material: null,
    geometry: null,
    object: null,
    moonQuantity: 0,
    moonObjects: [],
    matcap: matcapTexturePlanetLINK,
    label: labelChainlink,
    labelObject: null,
    originalHeight: 0,
    posX: 0,
    posZ: 0,
    ignoreField: true,
    insideColor: new THREE.Color("#88D3E2"),
    outsideColor: new THREE.Color("#0728A1"),
  },
};

let blackHole = new THREE.Object3D();
let blackHoleCenter: THREE.Mesh | null = null;
let blackHoleRing: THREE.Mesh | null = null;
let blackHoleHalo: THREE.Mesh | null = null;
let blackHoleTorusMaterialReflex: THREE.MeshStandardMaterial | null = null;

let lineMaterial: THREE.RawShaderMaterial | null = null;

const textParams = {
  defaultOpacity: 1,
  defaultScale: 0.6,
  hoverOpacity: 1,
  hoverScale: 0.8,
};

let matrixDataArray = new Float32Array(Float32Array.from(matrix));
const fieldParams = {
  fieldSize: 75,
  lines: 140,
  lineResolution: 0.02,
  matrixResolution: 512,
  blackHoleSize: 0.25,
  wellSize: 300,
  noise1: 3.0,
  noise2: 2.5,
  noise3: 0.8,
  spiralArms: 7,
  spiralAttenuation: 1.1,
  spiralTwist: -1.0,
  spiralSpeed: 4.3,
  spiralSize: 11.8,
  dampening: 1.0,
  distorsionMult: 2.5,
  blackHoleHeight: -2.5,
};
let doBloom = false;
if (window.innerHeight > window.innerWidth) {
  doBloom = false;
  fieldParams.lines = 90;
  fieldParams.lineResolution *= 1.6;
  fieldParams.matrixResolution = 300;
  fieldParams.distorsionMult = 2;
}

const fieldColor: any = {
  minimumAlpha: 1.0,
  maximumAlpha: 1.0,
  insideColor: new THREE.Color("#454d4f"),
  outsideColor: new THREE.Color("#1b0977"),
  startInsideColor: null,
  startOutsideColor: null,
};
fieldColor.startInsideColor = fieldColor.insideColor.clone();
fieldColor.startOutsideColor = fieldColor.outsideColor.clone();

var matrixTexture = new THREE.DataTexture(
  matrixDataArray,
  fieldParams.matrixResolution,
  fieldParams.matrixResolution,
  THREE.RedFormat,
  THREE.FloatType
);

InitMatrix();

function updateMatrixTexture() {
  if (criticalFPS < 4) {
    matrixDataArray.set(Float32Array.from(matrix));
    matrixTexture.needsUpdate = true;
  }
}

function InitMatrix() {
  matrix = [];
  for (
    let i = 0;
    i < fieldParams.matrixResolution * fieldParams.matrixResolution;
    i++
  ) {
    const height = 0;
    matrix.push(height, 0, 0, 0);
  }
  matrixDataArray = new Float32Array(Float32Array.from(matrix));
  matrixTexture = new THREE.DataTexture(
    matrixDataArray,
    fieldParams.matrixResolution,
    fieldParams.matrixResolution,
    THREE.RedFormat,
    THREE.FloatType
  );
}

function UpdateMatrix() {
  //Simulate Planets
  const fieldPitch = fieldParams.fieldSize / fieldParams.matrixResolution;

  const fieldSizeFactor = 1 / fieldParams.fieldSize;
  const cappedDeltaTime = Math.min(deltaTime, 0.2);

  if (criticalFPS < 3) {
    for (const key in planetList) {
      const planet = planetList[key as keyof typeof planetList];
      if (!planet.ignoreField) {
        const posX = planet.posX;
        const posZ = planet.posZ;
        const startX =
          (posX - planet.size * fieldParams.distorsionMult) *
          fieldParams.fieldSize;
        const startZ =
          (posZ - planet.size * fieldParams.distorsionMult) *
          fieldParams.fieldSize;
        const endX =
          (posX + planet.size * fieldParams.distorsionMult) *
          fieldParams.fieldSize;
        const endZ =
          (posZ + planet.size * fieldParams.distorsionMult) *
          fieldParams.fieldSize;
        const deltaX = 1 / (endX - startX);
        const deltaZ = 1 / (endZ - startZ);
        for (let i = startX; i < endX; i += fieldPitch) {
          for (let j = startZ; j < endZ; j += fieldPitch) {
            const pos = matrixIndex(i * fieldSizeFactor, j * fieldSizeFactor);
            const weight =
              Math.sin(Math.PI * (i - startX) * deltaX) *
              Math.sin(Math.PI * (j - startZ) * deltaZ);
            matrix[pos] -=
              weight * weight * weight * planet.density * cappedDeltaTime;
          }
        }
      }
    }
  }

  //Dampen
  for (let i = 0; i < matrix.length; i++) {
    matrix[i] /= fieldParams.dampening * (1 + deltaTime);
  }
}

function matrixIndex(x: number, y: number) {
  const matrixCoordX = Math.min(
    fieldParams.matrixResolution - 1,
    Math.round(x * fieldParams.matrixResolution)
  );
  const matrixCoordY = Math.min(
    fieldParams.matrixResolution - 1,
    Math.round(y * fieldParams.matrixResolution)
  );
  return matrixCoordY * fieldParams.matrixResolution + matrixCoordX;
}

function InitAstro() {
  const nebulaGeometry = new THREE.PlaneGeometry(120, 120);

  blackHoleTorusMaterialReflex = new THREE.MeshStandardMaterial({
    //envMap: textureCube,
    roughness: 0.0,
    metalness: 1.0,
  });
  // blackHoleTorusMaterialReflex.mipmaps = false
  const blackHoleRingMaterial = new THREE.MeshBasicMaterial({
    color: "#f7e5ff",
  });
  blackHoleRingMaterial.map = blackHoleRingTex;
  blackHoleRingMaterial.transparent = true;
  const blackHoleHaloMaterial = new THREE.MeshBasicMaterial();

  //Blackhole
  const blackHoleCenterGeometry = new THREE.TorusGeometry(9, 9, 64, 64);
  //const blackHoleHaloGeometry = new THREE.RingBufferGeometry( 3.6, 6.6, 60, 4);
  const blackHoleHaloGeometry = new THREE.PlaneGeometry(10.2, 10.2);
  const blackHoleRingGeometryDisk = new THREE.TorusGeometry(5, 0.6, 60, 60);

  blackHoleCenter = new THREE.Mesh(
    blackHoleCenterGeometry,
    blackHoleTorusMaterialReflex
  );
  blackHoleRing = new THREE.Mesh(
    blackHoleRingGeometryDisk,
    blackHoleRingMaterial
  );
  blackHoleHalo = new THREE.Mesh(blackHoleHaloGeometry, blackHoleHaloMaterial);
  blackHoleCenter.scale.set(
    fieldParams.blackHoleSize,
    fieldParams.blackHoleSize,
    fieldParams.blackHoleSize * 1.3
  );
  blackHole.position.set(0, fieldParams.blackHoleHeight, 0);

  scene.add(blackHole);
  scene.add(blackHoleCenter);
  scene.add(blackHoleRing);
  scene.add(blackHoleHalo);

  blackHoleCenter.parent = blackHole;
  blackHoleHalo.parent = blackHole;
  blackHoleRing.parent = blackHole;
  //blackHoleRing.parent = blackHole
  blackHoleHalo.position.set(0, 0, 0);
  //blackHoleRing.position.set(0,0,0)
  blackHoleRing.rotateX(Math.PI / 2);
  blackHoleRing.scale.set(1.12, 1.12, 0.4);
  blackHoleHaloMaterial.map = blackHoleGlow;
  blackHoleHaloMaterial.alphaMap = blackHoleGlow;
  blackHoleHaloMaterial.transparent = true;
  blackHoleHaloMaterial.alphaTest = 0.18;
  blackHoleHaloMaterial.blending = THREE.AdditiveBlending;
  blackHoleHaloMaterial.premultipliedAlpha = true;

  for (const myPlanet in planetList) {
    //PLANETS
    const realSize = (planetList[myPlanet].size / 2) * fieldParams.fieldSize;
    const planetGeometry = new THREE.SphereGeometry(realSize, 30, 30);
    planetList[myPlanet].geometry = planetGeometry;

    const planetMaterial = new THREE.MeshMatcapMaterial();
    planetMaterial.matcap = planetList[myPlanet].matcap;
    //planetMaterial.map = planetList[myPlanet].map
    planetList[myPlanet].material = planetMaterial;

    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planetList[myPlanet].object = planet;
    scene.add(planet);

    const labelMat = new THREE.MeshBasicMaterial();
    labelMat.transparent = true;
    labelMat.depthTest = true;
    labelMat.color = new THREE.Color(0.9, 0.9, 0.9);
    labelMat.map = planetList[myPlanet].label;
    labelMat.side = THREE.DoubleSide;
    labelMat.opacity = textParams.defaultOpacity;
    labelMat.alphaTest = 0.1;
    const labelGeo = new THREE.PlaneGeometry(5, 1, 1, 1);
    const labelObj = new THREE.Mesh(labelGeo, labelMat);
    scene.add(labelObj);
    labelObj.parent = planetList[myPlanet].object;
    labelObj.position.set(
      0,
      (planetList[myPlanet].size * fieldParams.fieldSize) / 2 + 0.8,
      0
    );
    labelObj.scale.set(
      textParams.defaultScale,
      textParams.defaultScale,
      textParams.defaultScale
    );
    planetList[myPlanet].labelObject = labelObj;

    //MOONS
    let moonObjects = [];
    let moonOrbits = [];
    let moonSpeeds = [];
    let moonHeight = [];
    let moonTargetHeight = [];
    let moonTargetXZ = [];
    let moonScale = [];
    for (let i = 0; i < planetList[myPlanet].moonQuantity; i++) {
      const moonSize = realSize * 0.1 * (1 + Math.random());
      const moonGeometry = new THREE.SphereGeometry(moonSize, 30, 30);

      const moonMaterial = new THREE.MeshBasicMaterial({ color: "white" });
      moonMaterial.map = textureMoon;

      const moon = new THREE.Mesh(moonGeometry, moonMaterial);
      moonObjects.push(moon);
      scene.add(moon);
      moon.parent = planetList[myPlanet].object;

      moon.rotation.set(
        Math.random() * 360,
        Math.random() * 360,
        Math.random() * 360
      );

      const planetSize = planetList[myPlanet].size * fieldParams.fieldSize;
      const orbit = planetSize * 0.6 + (1 + i) * 0.2;
      moonOrbits.push(orbit);

      const orbitSpeed =
        planetList[myPlanet].orbitSpeed * (Math.random() - 0.5) * 15;
      moonSpeeds.push(orbitSpeed);

      const orbitHeight = (Math.random() - 0.5) * planetSize * 0.4;
      moonHeight.push(orbitHeight);

      moonTargetHeight.push({ y: 0 });

      moonTargetXZ.push(new Vector2(0, 0));

      moonScale.push({ x: 1 });
    }
    planetList[myPlanet].moonObjects = moonObjects;
    planetList[myPlanet].moonSpeeds = moonSpeeds;
    planetList[myPlanet].moonOrbits = moonOrbits;
    planetList[myPlanet].moonHeight = moonHeight;
    planetList[myPlanet].moonTargetHeight = moonTargetHeight;
    planetList[myPlanet].moonTargetXZ = moonTargetXZ;
    planetList[myPlanet].moonScale = moonScale;
  }
}
function UpdateAstro() {
  for (const myPlanet in planetList) {
    const timer =
      elapsedTime * planetList[myPlanet].orbitSpeed +
      planetList[myPlanet].orbitOffset;
    const orbitRadius = planetList[myPlanet].orbitRadius;
    const posX = orbitRadius * Math.cos(timer) + 0.5;
    const posZ = orbitRadius * Math.sin(timer) + 0.5;
    planetList[myPlanet].posX = posX;
    planetList[myPlanet].posZ = posZ;
    planetList[myPlanet].timer = timer;
    planetList[myPlanet].object.position.set(
      fieldParams.fieldSize * (posX - 0.5),
      planetList[myPlanet].orbitHeight + animationParams.planetScale,
      -fieldParams.fieldSize * (posZ - 0.5)
    );
    //planetList[myPlanet].object.rotateY(-0.3*deltaTime)

    const cameraVector = camera.position.clone();
    cameraVector.multiplyScalar(10000);
    planetList[myPlanet].labelObject.lookAt(cameraVector);
    planetList[myPlanet].labelObject.position.set(
      0,
      (planetList[myPlanet].size * fieldParams.fieldSize) / 2 +
        camera.position.y / 50 +
        0.2,
      0
    );

    for (let i = 0; i < planetList[myPlanet].moonQuantity; i++) {
      let skip = false;
      if (lockedOnPlanet) {
        if (lockedOnPlanet.object.id == planetList[myPlanet].object.id)
          skip = true;
      }
      if (previousLockedPlanet) {
        if (previousLockedPlanet.object.id == planetList[myPlanet].object.id)
          skip = true;
      }
      const orbitSpeed = planetList[myPlanet].moonSpeeds[i];
      if (skip == false) {
        const orbit = planetList[myPlanet].moonOrbits[i];
        planetList[myPlanet].moonObjects[i].position.set(
          orbit * Math.cos(elapsedTime * orbitSpeed),
          planetList[myPlanet].moonHeight[i],
          orbit * Math.sin(elapsedTime * orbitSpeed)
        );
      } else {
        let posX = planetList[myPlanet].moonTargetXZ[i].x;
        let posZ = planetList[myPlanet].moonTargetXZ[i].y;
        if (currentState == 2) {
          const orbit =
            planetList[myPlanet].size * 0.5 * 0.8 * fieldParams.fieldSize;
          posX = orbit * Math.cos(-Math.PI * 0.5 - planetList[myPlanet].timer);
          posZ = orbit * Math.sin(-Math.PI * 0.5 - planetList[myPlanet].timer);
        }
        planetList[myPlanet].moonObjects[i].position.set(
          posX,
          planetList[myPlanet].moonTargetHeight[i].y,
          posZ
        );
      }
      const moonScale = planetList[myPlanet].moonScale[i].x;
      planetList[myPlanet].moonObjects[i].scale.set(
        moonScale,
        moonScale,
        moonScale
      );

      planetList[myPlanet].moonObjects[i].rotateX(deltaTime * 0.3);
    }

    planetList[myPlanet].labelObject.material.opacity =
      cameraMotion.labelOpacity;

    // let skip = false
    //
    // if (lockedOnPlanet) {
    //     if (lockedOnPlanet.object.id == planetList[myPlanet].object.id) skip = true
    // }
    // if (previousLockedPlanet) {
    //     if (previousLockedPlanet.object.id == planetList[myPlanet].object.id) skip = true
    // }
    // if (!skip) {
    //planetList[myPlanet].object.scale.set(animationParams.planetScale, animationParams.planetScale, animationParams.planetScale)
    // }
  }

  blackHole.lookAt(camera.position);
  blackHoleRing!.lookAt(camera.position.x, 0, camera.position.z);
  //blackHoleRing.position.set(0,-2.5,0)
  blackHoleRing!.rotateX(33);

  //blackHoleHalo.scale.set(1 + 0.01*Math.sin(elapsedTime*2),1 - 0.01*Math.sin(elapsedTime*1),1)
}

const envSize = 256;

const cubeRenderTarget1 = new THREE.WebGLCubeRenderTarget(envSize);
// cubeRenderTarget1.m = false

const cubeCamera1 = new THREE.CubeCamera(1, 150, cubeRenderTarget1);

let currentState = 0;
const cameraMotion = {
  currentPosition: new THREE.Vector3(0, 0, 0),
  currentFOV: 0,
  timer: 0,
  zoomInDuration: 4,
  lookTarget: new THREE.Vector3(0, 0, 0),
  uiOpacity: 0,
  labelOpacity: 0,
  blackHoleLockHeight: 0,
};
// 0 - orbit
// 1 - on planet
// 2 - changing

gsap.registerPlugin(CustomEase);

CustomEase.create(
  "superSmooth",
  "M0,0 C0.25,-0.01 0.425,0.414 0.526,0.606 0.646,0.836 0.818,1.001 1,1 "
);

CustomEase.create(
  "custom",
  "M0,0 C0.25,-0.01 0.425,0.414 0.526,0.606 0.646,0.836 0.818,1.001 1,1 "
);

gsap.defaults({
  ease: "superSmooth",
  duration: 1.7,
  delay: 0.0,
});

let startAnimationRunning = false;

let line1Field = document.createElement("div");
let line2Field = document.createElement("div");
let line3Field = document.createElement("div");
let line4Field = document.createElement("div");

function EndAnimation() {
  controls.enabled = true;
  startAnimationRunning = false;
  controls.maxDistance = 200;
  controls.minDistance = 50;
}

function StartAnimation() {
  startAnimationRunning = true;
  const startCameraZ = cameraParams.defaultZ;
  const startCameraHeight = cameraParams.defaultHeight;
  const startFieldSize = fieldParams.fieldSize;
  const startAlpha = fieldColor.maximumAlpha;
  fieldColor.maximumAlpha = 0;
  fieldParams.blackHoleSize = 1;
  cameraParams.defaultZ = 0;
  cameraParams.defaultHeight = 50;
  fieldParams.fieldSize = 250;
  controls.enabled = false;
  animationParams.ringScale = 0;

  gsap.to(fieldParams, {
    duration: 4.5,
    ease: "power1",
    delay: 0,
    fieldSize: startFieldSize,
  });
  gsap.to(fieldColor, {
    duration: 4,
    delay: 0,
    ease: "power1",
    maximumAlpha: startAlpha,
  });
  gsap.to(cameraParams, {
    duration: 3.5,
    ease: "power1",
    delay: 0,
    defaultHeight: startCameraHeight,
  });
  gsap.to(cameraParams, { duration: 4, delay: 0, defaultZ: startCameraZ });
  //gsap.to(animationParams, {duration: 3, ease:"power1", delay: 4, ringScale: 1})

  animationParams.distorsionMult = fieldParams.distorsionMult;
  fieldParams.distorsionMult = 0;
  gsap.to(fieldParams, {
    duration: 1,
    ease: "power1",
    delay: 1,
    distorsionMult: animationParams.distorsionMult,
  });

  animationParams.minimumAlpha = fieldColor.minimumAlpha;
  fieldColor.minimumAlpha = 0;
  gsap.to(fieldColor, {
    duration: 2,
    ease: "power1",
    delay: 2,
    minimumAlpha: animationParams.minimumAlpha,
  });

  animationParams.wellSize = fieldParams.wellSize;
  fieldParams.wellSize = -2;
  gsap.to(fieldParams, {
    duration: 2,
    ease: "power1",
    delay: 3,
    wellSize: animationParams.wellSize,
  });

  animationParams.spiralSize = fieldParams.spiralSize;
  fieldParams.spiralSize = 0;
  gsap.to(fieldParams, {
    duration: 3,
    ease: "power1",
    delay: 2.7,
    spiralSize: animationParams.spiralSize,
  });

  animationParams.blackHoleY = 50;
  gsap.to(animationParams, {
    duration: 4,
    ease: "power1",
    blackHoleY: fieldParams.blackHoleHeight,
    onComplete: EndAnimation,
  });

  // line1Field = document.createElement('div');
  // line1Field.innerHTML = "space and time"
  // line1Field.style.position = 'absolute';
  // line1Field.style.color = "white"
  // line1Field.style.opacity = 0
  // line1Field.style.fontFamily = "Inter, sans-serif"
  // line1Field.style.textAlign = "center"
  // line1Field.style.left = 0 + "%"
  // line1Field.style.right = 0 + "%"
  // line1Field.style.top = 14 + "vh"
  // line1Field.style.display = "block"
  // line1Field.style.fontSize = 20 + 'px';
  // line1Field.style.textTransform = "uppercase"
  // line1Field.style.fontWeight = "200";
  // line1Field.style.letterSpacing = 0.2 + "em"
  // document.body.appendChild(line1Field);

  // gsap.to(line1Field.style, {duration: 0.5, delay: 0.2, ease:"power1", opacity: 1})
  // gsap.to(line1Field.style, {duration: 5, delay: 1, ease:"power1", opacity: 0, onComplete: RemoveTitleField})

  // line2Field = document.createElement('div');
  // line2Field.style.position = 'absolute';
  // line2Field.style.color = "white"
  // line2Field.style.opacity = 0
  // line2Field.style.fontFamily = "Inter, sans-serif"
  // line2Field.style.textAlign = "center"
  // line2Field.innerHTML = "the first decentralized <br> data warehouse"
  // line2Field.style.left = 0 + "%"
  // line2Field.style.right = 0 + "%"
  // line2Field.style.top = 18 + "vh"
  // line2Field.style.fontSize = 30 + 'px';
  // line2Field.style.lineHeight = 40 + 'px';
  // line2Field.style.textTransform = "uppercase"
  // line2Field.style.letterSpacing = 0.2 + "em"
  // document.body.appendChild(line2Field);

  // gsap.to(line2Field.style, {duration: 0.5, delay: 0.2, ease:"power1", opacity: 1})
  // gsap.to(line2Field.style, {duration: 4, delay: 1.5, ease:"power1", opacity: 0})

  // line3Field = document.createElement('div');
  // line3Field.style.position = 'relative';
  // line3Field.style.color = "white"
  // line3Field.style.opacity = 1
  // line3Field.style.fontFamily = "Inter, sans-serif"
  // line3Field.style.textAlign = "center"
  // line3Field.innerHTML = "Enabling lightspeed-fast analytics at enterprise scale"
  // line3Field.style.left = 0 + "%"
  // line3Field.style.right = 0 + "%"
  // line3Field.style.bottom = 0 + "%"
  // line3Field.style.top = 0 + "%"
  // line3Field.style.paddingLeft = 10 + "px"
  // line3Field.style.paddingRight = 10 + "px"
  // line3Field.style.paddingTop = 6 + "px"
  // line3Field.style.fontSize = 20 + 'px';
  // line3Field.style.textTransform = "uppercase"
  // line3Field.style.fontWeight = "200";
  // line3Field.style.lineHeight = 40 + 'px';
  // line3Field.style.letterSpacing = 0.2 + "em"
  // line2Field.appendChild(line3Field);

  //gsap.to(line3Field.style, {duration: 0.5, delay: 0.2, ease:"power1", opacity: 1})
  //gsap.to(line3Field.style, {duration: 5, delay: 1, ease:"power1", opacity: 0})

  // line4Field = document.createElement('div');
  // //line4Field.innerHTML = "touch to interact"
  // line4Field.innerHTML = "fetching data..."
  // line4Field.style.position = 'absolute';
  // line4Field.style.color = "white"
  // line4Field.style.opacity = 0
  // line4Field.style.fontFamily = "Inter, sans-serif"
  // line4Field.style.textAlign = "center"
  // line4Field.style.left = 0 + "%"
  // line4Field.style.right = 0 + "%"
  // line4Field.style.bottom = 0 + "%"
  // line4Field.style.paddingBottom = 4 + "vh"
  // line4Field.style.display = "block"
  // line4Field.style.fontSize = 12 + 'px';
  // line4Field.style.textTransform = "uppercase"
  // line4Field.style.fontWeight = "200";
  // line4Field.style.letterSpacing = 0.2 + "em"
  // document.body.appendChild(line4Field);

  gsap.to(line4Field.style, {
    duration: 0.5,
    delay: 1,
    ease: "power1",
    opacity: 1,
  });
  //gsap.to(line4Field.style, {duration: 3, delay: 5, ease:"power1", opacity: 0, onComplete: RemoveInteractField})
}

function InitLines() {
  if (lines.length != 0) {
    for (let i = 0; i < lines.length; i++) {
      scene.remove(lines[i]);
    }
  }

  lines = [];

  let pingpong = false;
  const lineMinRadius = 0.01;
  const lineMaxRadius = 0.5;
  const lineRadiusDelta =
    (lineMaxRadius - lineMinRadius) / (fieldParams.lines + 1);
  const lineRadialPitch = fieldParams.lineResolution;

  lineMaterial = new THREE.RawShaderMaterial({
    vertexShader: lineVertexShader,
    fragmentShader: lineFragmentShader,
    // vertexShader:
    //   "precision lowp float;\n\nuniform mat4 projectionMatrix;\nuniform mat4 viewMatrix;\nuniform mat4 modelMatrix;\n\nuniform float uFieldSize;\nuniform float uRadialPitch;\nuniform sampler2D uMatrixTexture;\nuniform float uTime;\nuniform float uWellSize;\nuniform float uNoise1;\nuniform float uNoise2;\nuniform float uNoise3;\nuniform float uSpiralArms;\nuniform float uSpiralAttenuation;\nuniform float uSpiralSize;\nuniform float uSpiralSpeed;\nuniform float uSpiralTwist;\n\nattribute vec3 position;\n\nvarying float vAccentColor;\nvarying float vLineRadius;\n\nfloat uLineRadius;\n\n// Classic Perlin 3D Noise \n// by Stefan Gustavson\n//\nvec4 permute(vec4 x)\n{\n    return mod(((x*34.0)+1.0)*x, 289.0);\n}\nvec4 taylorInvSqrt(vec4 r)\n{\n    return 1.79284291400159 - 0.85373472095314 * r;\n}\nvec3 fade(vec3 t)\n{\n    return t*t*t*(t*(t*6.0-15.0)+10.0);\n}\n\nfloat cnoise(vec3 P)\n{\n    vec3 Pi0 = floor(P); // Integer part for indexing\n    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1\n    Pi0 = mod(Pi0, 289.0);\n    Pi1 = mod(Pi1, 289.0);\n    vec3 Pf0 = fract(P); // Fractional part for interpolation\n    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0\n    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n    vec4 iy = vec4(Pi0.yy, Pi1.yy);\n    vec4 iz0 = Pi0.zzzz;\n    vec4 iz1 = Pi1.zzzz;\n\n    vec4 ixy = permute(permute(ix) + iy);\n    vec4 ixy0 = permute(ixy + iz0);\n    vec4 ixy1 = permute(ixy + iz1);\n\n    vec4 gx0 = ixy0 / 7.0;\n    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;\n    gx0 = fract(gx0);\n    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n    vec4 sz0 = step(gz0, vec4(0.0));\n    gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n    gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n    vec4 gx1 = ixy1 / 7.0;\n    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;\n    gx1 = fract(gx1);\n    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n    vec4 sz1 = step(gz1, vec4(0.0));\n    gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n    gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\n    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\n    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\n    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\n    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\n    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\n    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\n    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\n\n    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n    g000 *= norm0.x;\n    g010 *= norm0.y;\n    g100 *= norm0.z;\n    g110 *= norm0.w;\n    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n    g001 *= norm1.x;\n    g011 *= norm1.y;\n    g101 *= norm1.z;\n    g111 *= norm1.w;\n\n    float n000 = dot(g000, Pf0);\n    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n    float n111 = dot(g111, Pf1);\n\n    vec3 fade_xyz = fade(Pf0);\n    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); \n    return 2.2 * n_xyz;\n}\n\nvoid main()\n{\n    vec2 pos = vec2(0,0);;\n    \n    pos.x = position.y;\n    pos.y = position.z;\n    //MATRIX\n    vec4 tex = texture2D(uMatrixTexture, pos);\n    float matrixHeight = tex.r;\n\n\n    pos.x = position.y - 0.5;\n    pos.y = position.z - 0.5;\n\n    uLineRadius = length(pos);\n    vLineRadius = uLineRadius;\n\n    \n\n    \n\n    //NOISE\n    float noise1 = 0.5 * cnoise(vec3(pos * 2.0, uTime * 0.03)) + 0.5 * cnoise(vec3(pos * 4.0, uTime * 0.04));\n    float noise2 = cnoise(vec3(pos * 30.0, uTime * 0.7)) + 0.6*cnoise(vec3(pos * 40.0, uTime * 0.9));\n    //float noise3 = abs(cnoise(vec3(pos * 40.0, uTime * 0.3)));\n\n    float noiseWave = max(0.0,(0.2 + 0.5 * sin(uTime * 0.6)) * (sin(uLineRadius * 15.0 + uTime * 1.0 + 60.0) - 0.4 ));\n\n    float noiseOnField1 = noise1 * uNoise1;\n\n    float noiseOnField2 = noise2 * uNoise2 * noiseWave;\n\n    //float noiseOnDistortion = noise3 * uNoise3 * matrixHeight * (0.1 + 2.0 * noiseWave);\n\n    //matrixHeight = matrixHeight * (0.75 + 1.5 * noiseWave);\n\n    float noiseHeight = (noiseOnField1 + noiseOnField2 * uLineRadius * 2.0) / (1.0 + abs(matrixHeight * 0.0));// + noiseOnDistortion;\n\n    //WELL\n\n    pos.x = uFieldSize * (pos.x);\n    pos.y = -uFieldSize * (pos.y);\n\n    float realRadius = uLineRadius * uFieldSize;\n\n    float wellHeight = -1.0 / (realRadius*realRadius) * uWellSize;\n\n    // if (uLineRadius < 0.07) {\n    //     wellHeight = 0.0;\n    // }\n\n    //SPIRAL\n\n    float spiralArms = uSpiralArms;\n    float spiralDistanceAttenuation = uSpiralAttenuation;\n    float spiralTwist = uSpiralTwist;\n    float spiralSpeed = uSpiralSpeed;\n    float spiralSize = uSpiralSize;\n\n    float spiralHeight = \n        spiralSize/(1.0 + realRadius*spiralDistanceAttenuation) * \n        (\n            0.7*sin(-uTime * spiralSpeed\n            + realRadius * spiralTwist\n            + position.x * uRadialPitch * spiralArms) \n            +\n            0.7*cos(-uTime*0.5 * spiralSpeed\n            + realRadius * spiralTwist/2.0\n            + position.x * uRadialPitch * spiralArms)\n        )/(1.0 + abs(matrixHeight)*2.0);\n    \n\n    //TOTAL HEIGHT\n\n    float height = matrixHeight + noiseHeight + wellHeight + spiralHeight;\n\n    //OPACITY\n\n    vAccentColor = 0.0 + abs(matrixHeight*0.6) + spiralHeight;\n\n    float waveMoveFactor = 0.2 * noiseWave;\n\n    gl_Position = projectionMatrix * viewMatrix * modelMatrix\n    * vec4(pos.x * (1.0 - waveMoveFactor), height - 3.5, pos.y * (1.0 - waveMoveFactor), 1.0);\n}",
    // fragmentShader:
    //   "precision lowp float;\n\nuniform vec3 fogColor;\nuniform float fogNear;\nuniform float fogFar;\nuniform float uLineRadius;\n\nuniform float uMinimumAlpha;\nuniform float uMaximumAlpha;\nuniform vec3 uInsideColor;\nuniform vec3 uOutsideColor;\n\nvarying float vAccentColor;\nvarying float vLineRadius;\n\nvoid main()\n{\n    float alpha = (uMinimumAlpha + uMaximumAlpha * (1.0 - vLineRadius * 1.0)) * sin(vLineRadius*2.0*vLineRadius*2.0 * 3.14);\n    vec3 color = mix(uInsideColor, uOutsideColor, vLineRadius * 2.0);\n    vec3 accentColor = vec3(0.66, 0.25, 0.88);\n    color = mix(color, accentColor, vAccentColor * 0.8);\n    // if (vLineRadius < 0.07) {\n    //     color = vec3(1.0,1.0,1.0);\n    //     alpha = 0.3;\n    // }\n    gl_FragColor = vec4(color.rgb, alpha);\n    //gl_FragColor = vec4(1.0,1.0,1.0,1.0);\n    \n    \n        //   #ifdef USE_LOGDEPTHBUF_EXT\n        //       float depth = gl_FragDepthEXT / gl_FragCoord.w;\n        //   #else\n        //       float depth = gl_FragCoord.z / gl_FragCoord.w;\n        //   #endif\n        //   float fogFactor = smoothstep( fogNear, fogFar, depth );\n        //   gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n   \n    \n}",

    uniforms: {
      uTime: { value: elapsedTime },
      uMatrixTexture: { value: matrixTexture },
      uRadialPitch: { value: lineRadialPitch },
      uFieldSize: { value: fieldParams.fieldSize },
      uWellSize: { value: fieldParams.wellSize },
      uNoise1: { value: fieldParams.noise1 },
      uNoise2: { value: fieldParams.noise2 },
      uNoise3: { value: fieldParams.noise3 },
      uMinimumAlpha: { value: fieldColor.minimumAlpha },
      uMaximumAlpha: { value: fieldColor.maximumAlpha },
      uInsideColor: { value: fieldColor.insideColor },
      uOutsideColor: { value: fieldColor.outsideColor },
      uSpiralArms: { value: fieldParams.spiralArms },
      uSpiralAttenuation: { value: fieldParams.spiralAttenuation },
      uSpiralSize: { value: fieldParams.spiralSize },
      uSpiralSpeed: { value: fieldParams.spiralSpeed },
      uSpiralTwist: { value: fieldParams.spiralTwist },
    },
    //transparent: true,
    blending: THREE.AdditiveBlending,
  });

  for (let i = 0; i < fieldParams.lines; i++) {
    let lineRadius = lineMinRadius + i * lineRadiusDelta;
    const lineTotalPoints = (Math.PI * 2) / lineRadialPitch;

    let linePoints = [];
    let rads = 0;
    for (let j = 0; j < lineTotalPoints + 1; j++) {
      rads = lineRadialPitch * j;
      if (j + 1 > lineTotalPoints + 1) rads = Math.PI * 2;
      linePoints.push(
        new THREE.Vector3(
          j,
          lineRadius * Math.cos(rads) + 0.5,
          lineRadius * Math.sin(rads) + 0.5
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);

    lines.push(new THREE.Line(geometry, lineMaterial));

    scene.add(lines[i]);
  }
}

function UpdateLines() {
  if (!lineMaterial) return;
  lineMaterial.uniforms.uMatrixTexture.value = matrixTexture;
  lineMaterial.uniforms.uTime.value += deltaTime * timeModifier;
  lineMaterial.uniforms.uNoise1.value = fieldParams.noise1;
  lineMaterial.uniforms.uNoise2.value = fieldParams.noise2;
  lineMaterial.uniforms.uNoise3.value = fieldParams.noise3;
  lineMaterial.uniforms.uSpiralSize.value = fieldParams.spiralSize;
  lineMaterial.uniforms.uSpiralAttenuation.value =
    fieldParams.spiralAttenuation;
  lineMaterial.uniforms.uWellSize.value = fieldParams.wellSize;
  lineMaterial.uniforms.uInsideColor.value = fieldColor.insideColor;
  lineMaterial.uniforms.uOutsideColor.value = fieldColor.outsideColor;
  lineMaterial.uniforms.uMinimumAlpha.value = fieldColor.minimumAlpha;
  lineMaterial.uniforms.uMaximumAlpha.value = fieldColor.maximumAlpha;
  lineMaterial.needsUpdate = true;
}

function AnimationUpdate() {
  if (startAnimationRunning) {
    camera.position.set(0, cameraParams.defaultHeight, cameraParams.defaultZ);
    blackHole.position.set(0, animationParams.blackHoleY, 0);
    controls.target = blackHole.position.clone();
  }
}

var fps: number[] = [];

fpsInit();

function fpsInit() {
  for (let index = 0; index < 60; index++) {
    fps.push(80);
  }
}

function fpsLogger() {
  if (criticalFPS < 5) {
    fps.push(1 / deltaTime);
    fps.shift();

    const sum = fps.reduce((a, b) => a + b, 0);
    const avg = sum / fps.length || 0;

    if (avg < 40) {
      criticalFPS++;
      fpsInit();
    }
  }
}

function tick() {
  deltaTime = clock.getDelta();
  elapsedTime += deltaTime;

  // Render
  // if (criticalFPS < 2 && doBloom) effectComposer.render()
  // else

  AnimationUpdate();
  UpdateAstro();
  UpdateMatrix();
  updateMatrixTexture();
  UpdateLines();

  fpsLogger();

  controls.update();

  renderer.render(scene, camera);
  if (count <= 0 && criticalFPS < 1) {
    for (const myPlanet in planetList) {
      const planet = planetList[myPlanet as keyof typeof planetList];
      planet.object.visible = false;
      planet.labelObject.visible = false;
      for (let i = 0; i < planet.moonQuantity; i++) {
        planet.moonObjects[i].visible = false;
      }
    }
    blackHoleCenter!.visible = false;
    blackHoleHalo!.visible = false;
    //blackHoleRing.visible = true
    cubeCamera1.update(renderer, scene);
    // cubeRenderTarget1.needsUpdate = true
    blackHoleTorusMaterialReflex!.envMap = cubeRenderTarget1.texture;
    for (const myPlanet in planetList) {
      planetList[myPlanet].object.visible = true;
      planetList[myPlanet].labelObject.visible = true;
      for (let i = 0; i < planetList[myPlanet].moonQuantity; i++) {
        planetList[myPlanet].moonObjects[i].visible = true;
      }
    }
    //blackHoleRing.visible = true
    blackHoleCenter!.visible = true;
    blackHoleHalo!.visible = true;
    count++;
  } else count = 0;

  window.requestAnimationFrame(tick);
}

InitLines();
InitAstro();
tick();
