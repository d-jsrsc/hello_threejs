```ts
// https://spaceandtimedb.com/
import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { BufferGeometry, Camera, Color, TextureFilter, Vector2, Vector3 } from 'three'
import lineVertexShader from './shaders/lines/vertex.glsl'
import lineFragmentShader from './shaders/lines/fragment.glsl'
import gsap from 'gsap'
import { CustomEase } from "gsap/CustomEase";
import { degToRad, radToDeg } from 'three/src/math/MathUtils'

/**
 * BASE BASE BASE BASE BASE BASE BASE BASE
 */

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
var fogColor = new THREE.Color('black');
scene.background = fogColor;
//scene.fog = new THREE.Fog(fogColor, 50, 500)

// Debug
//const gui = new dat.GUI()
//gui.close();



//*
//FIELD FIELD FIELD FIELD FIELD FIELD FIELD FIELD FIELD
//*

let matrix = []
let lines = []
let destroyLines = false;

let matrixDataArray = new Float32Array(Float32Array.from(matrix))

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
    dampening: 1.000,
    distorsionMult: 2.5,
    blackHoleHeight: -2.5
}

let doBloom = false
if (window.innerHeight > window.innerWidth) {
    doBloom = false
    fieldParams.lines = 90
    fieldParams.lineResolution *= 1.6
    fieldParams.matrixResolution = 300
    fieldParams.distorsionMult = 2
}

const fieldColor = {
    minimumAlpha: 1.0,
    maximumAlpha: 1.0,
    insideColor: new THREE.Color('#454d4f'),
    outsideColor: new THREE.Color('#1b0977'),
    startInsideColor: null,
    startOutsideColor: null
}
fieldColor.startInsideColor = fieldColor.insideColor.clone()
fieldColor.startOutsideColor = fieldColor.outsideColor.clone()

var matrixTexture = new THREE.DataTexture(
    matrixDataArray, 
    fieldParams.matrixResolution, 
    fieldParams.matrixResolution,
    THREE.RedFormat,
    THREE.FloatType
)

InitMatrix()

function updateMatrixTexture() {
    if (criticalFPS < 4) {
        matrixDataArray.set(Float32Array.from(matrix))
        matrixTexture.needsUpdate = true
    }
}

function InitMatrix() {
    matrix = []
    for (let i = 0; i < fieldParams.matrixResolution*fieldParams.matrixResolution; i++) {
        const height = 0
        matrix.push(height, 0, 0, 0)
    }
    matrixDataArray = new Float32Array(Float32Array.from(matrix))
    matrixTexture = new THREE.DataTexture(
        matrixDataArray, 
        fieldParams.matrixResolution, 
        fieldParams.matrixResolution,
        THREE.RedFormat,
        THREE.FloatType
    )
}

function UpdateMatrix() {
    //Simulate Planets
    const fieldPitch = fieldParams.fieldSize / fieldParams.matrixResolution

    const fieldSizeFactor = 1/fieldParams.fieldSize
    const cappedDeltaTime = Math.min(deltaTime, 0.2)

    if (criticalFPS < 3) {
        for (const planet in planetList) {
            if (!planetList[planet].ignoreField) {
                const posX = planetList[planet].posX
                const posZ = planetList[planet].posZ
                const startX = (posX - planetList[planet].size * fieldParams.distorsionMult) * fieldParams.fieldSize
                const startZ = (posZ - planetList[planet].size * fieldParams.distorsionMult) * fieldParams.fieldSize 
                const endX = (posX + planetList[planet].size * fieldParams.distorsionMult) * fieldParams.fieldSize 
                const endZ = (posZ + planetList[planet].size * fieldParams.distorsionMult) * fieldParams.fieldSize 
                const deltaX = 1/(endX - startX)
                const deltaZ = 1/(endZ - startZ)
                for (let i = startX; i < endX; i += fieldPitch) {
                    for (let j = startZ; j < endZ; j += fieldPitch) {
                        const pos = matrixIndex(
                            i * fieldSizeFactor,
                            j * fieldSizeFactor
                            )
                        const weight = Math.sin(Math.PI * (i - startX)*deltaX) * Math.sin(Math.PI * (j-startZ)*deltaZ)
                        matrix[pos] -= weight * weight * weight * planetList[planet].density * cappedDeltaTime
                    } 
                } 
            }
        }
    }

    //Dampen
    for (let i = 0; i < matrix.length; i++) {
        matrix[i] /= fieldParams.dampening * (1 + deltaTime)
    }

    
}

function matrixIndex(x, y) {
    const matrixCoordX = Math.min( fieldParams.matrixResolution - 1, Math.round( x * fieldParams.matrixResolution))
    const matrixCoordY = Math.min( fieldParams.matrixResolution - 1, Math.round( y * fieldParams.matrixResolution))
    return matrixCoordY * fieldParams.matrixResolution + matrixCoordX
} 

//init lines

let lineMaterial = null


function InitLines() {
    if (lines.length != 0) {
        for (let i = 0; i < lines.length; i++) {
            scene.remove(lines[i])
        }
    }

    lines = []

    let pingpong = false
    const lineMinRadius = 0.01
    const lineMaxRadius = 0.5
    const lineRadiusDelta = (lineMaxRadius - lineMinRadius) / (fieldParams.lines+1)
    const lineRadialPitch = fieldParams.lineResolution
        
    lineMaterial = new THREE.RawShaderMaterial({
        vertexShader: lineVertexShader,
        fragmentShader: lineFragmentShader,
        uniforms: {
            uTime: {value: elapsedTime},
            uMatrixTexture: { value: matrixTexture },
            uRadialPitch: {value: lineRadialPitch},
            uFieldSize: {value: fieldParams.fieldSize},
            uWellSize: {value: fieldParams.wellSize},
            uNoise1: {value: fieldParams.noise1},
            uNoise2: {value: fieldParams.noise2},
            uNoise3: {value: fieldParams.noise3},
            uMinimumAlpha: { value: fieldColor.minimumAlpha},
            uMaximumAlpha: { value: fieldColor.maximumAlpha},
            uInsideColor: { value: fieldColor.insideColor},
            uOutsideColor: { value: fieldColor.outsideColor},
            uSpiralArms: { value: fieldParams.spiralArms},
            uSpiralAttenuation: { value: fieldParams.spiralAttenuation},
            uSpiralSize: { value: fieldParams.spiralSize},
            uSpiralSpeed: { value: fieldParams.spiralSpeed},
            uSpiralTwist: { value: fieldParams.spiralTwist}
        },
        //transparent: true,
        blending:THREE.AdditiveBlending
    })

    for (let i = 0; i < fieldParams.lines; i++) {

        let lineRadius = lineMinRadius + i * lineRadiusDelta
        const lineTotalPoints = Math.PI*2/lineRadialPitch

        let linePoints = []
        let rads = 0
        for (let j = 0; j < lineTotalPoints+1; j++) {
            rads = lineRadialPitch * j
            if (j+1 > lineTotalPoints+1) rads = Math.PI*2
            linePoints.push
            (
                new THREE.Vector3(
                    j, 
                    lineRadius*Math.cos(rads) + 0.5, 
                    lineRadius*Math.sin(rads) + 0.5)
            )
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);

        lines.push(new THREE.Line(geometry, lineMaterial))
        
        scene.add(lines[i])
    }
}

function UpdateLines() {
        lineMaterial.uniforms.uMatrixTexture.value = matrixTexture
        lineMaterial.uniforms.uTime.value += deltaTime * timeModifier
        lineMaterial.uniforms.uNoise1.value = fieldParams.noise1
        lineMaterial.uniforms.uNoise2.value = fieldParams.noise2
        lineMaterial.uniforms.uNoise3.value = fieldParams.noise3
        lineMaterial.uniforms.uSpiralSize.value = fieldParams.spiralSize
        lineMaterial.uniforms.uSpiralAttenuation.value = fieldParams.spiralAttenuation
        lineMaterial.uniforms.uWellSize.value = fieldParams.wellSize
        lineMaterial.uniforms.uInsideColor.value = fieldColor.insideColor
        lineMaterial.uniforms.uOutsideColor.value = fieldColor.outsideColor
        lineMaterial.uniforms.uMinimumAlpha.value = fieldColor.minimumAlpha
        lineMaterial.uniforms.uMaximumAlpha.value = fieldColor.maximumAlpha
        lineMaterial.needsUpdate = true
}





//*
//SPACE OBJECTS SPACE OBJECTS SPACE OBJECTS SPACE OBJECTS SPACE OBJECTS SPACE OBJECTS
//*

//Reflections

const envSize = 256;

const cubeRenderTarget1 = new THREE.WebGLCubeRenderTarget( envSize );
cubeRenderTarget1.mipmaps = false

const cubeCamera1 = new THREE.CubeCamera( 1, 150, cubeRenderTarget1 );

//Textures
 const textureLoader = new THREE.TextureLoader()
 const matcapTexturePlanetETH = textureLoader.load('./textures/matcaps/matETH.png')
 const matcapTexturePlanetSOL = textureLoader.load('./textures/matcaps/matSOL.png')
 const matcapTexturePlanetBNB = textureLoader.load('./textures/matcaps/matBNB.png')
 const matcapTexturePlanetPOLY = textureLoader.load('./textures/matcaps/matPOLY.png')
 const matcapTexturePlanetAVAX = textureLoader.load('./textures/matcaps/matAVAX.png')
 const matcapTexturePlanetFTM = textureLoader.load('./textures/matcaps/matFTM.png')
 const matcapTexturePlanetLINK = textureLoader.load('./textures/matcaps/matLINK.png')
 const textureMoon = textureLoader.load('./textures/maps/moon.jpeg')
 const labelAvalanche = textureLoader.load('./textures/labels/labelAvalanche.png')
 const labelBinance = textureLoader.load('./textures/labels/labelBinance.png')
 const labelEthereum = textureLoader.load('./textures/labels/labelEthereum.png')
 const labelFantom = textureLoader.load('./textures/labels/labelFantom.png')
 const labelPolygon = textureLoader.load('./textures/labels/labelPolygon.png')
 const labelSolana = textureLoader.load('./textures/labels/labelSolana.png')
 const labelChainlink = textureLoader.load('./textures/labels/labelChainlink.png')
 const blackHoleGlow = textureLoader.load('./textures/maps/2dglow001.png')
 const blackHoleRingTex = textureLoader.load('./textures/maps/blackhole-ring008.png')
 const texture = textureLoader.load('./textures/environment/sxt-environment-005.png',
    () => {
      const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
      rt.fromEquirectangularTexture(renderer, texture);
      scene.background = rt.texture;
    });
    texture.mipmaps = false
 labelAvalanche.mipmaps = false
 labelBinance.mipmaps = false
 labelBinance.mipmaps = false
 labelEthereum.mipmaps = false
 labelFantom.mipmaps = false
 labelPolygon.mipmaps = false
 labelSolana.mipmaps = false
 matcapTexturePlanetETH.mipmaps = false
 matcapTexturePlanetSOL.mipmaps = false
 matcapTexturePlanetBNB.mipmaps = false
 matcapTexturePlanetPOLY.mipmaps = false
 matcapTexturePlanetAVAX.mipmaps = false
 matcapTexturePlanetFTM.mipmaps = false
 matcapTexturePlanetLINK.mipmaps = false

const planetList = {
     planet0 : {
        index: 15,
        size : 0.05 * 0.7,
        orbitRadius: 0.21 * 0.7,
        orbitSpeed: 0.115,
        orbitHeight: -1.8,
        orbitOffset: -0.5,
        density: 2.5,
        material: null,
        geometry: null,
        object: null,
        moonQuantity : 4,
        moonObjects: [],
        matcap: matcapTexturePlanetPOLY,
        label: labelPolygon,
        labelObject: null,
        originalHeight: 0,
        posX: 0,
        posZ: 0,
        ignoreField: false,
        insideColor: new THREE.Color('#A792E6'),
        outsideColor: new THREE.Color('#4F34A4')
    },
    planet1 : {
        index: 25,
        size : 0.04 * 0.7,
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
        insideColor: new THREE.Color('#699DE2'),
        outsideColor: new THREE.Color('#173FAD')
    },
    planet2 : {
        index: 20,
        size : 0.045 * 0.7,
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
        insideColor: new THREE.Color('#CC3333'),
        outsideColor: new THREE.Color('#CC3333')
    },
    planet3 : {
        index: 0,
        size : 0.075 * 0.7,
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
        insideColor: new THREE.Color('#281660'),
        outsideColor: new THREE.Color('#4387AE')
    },
    planet4 : {
        index: 5,
        size : 0.065 * 0.7,
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
        insideColor: new THREE.Color('#2C6060'),
        outsideColor: new THREE.Color('#281660')
    },
    planet5 : {
        index: 10,
        size : 0.055 * 0.7,
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
        insideColor: new THREE.Color('#C97C3C'),
        outsideColor: new THREE.Color('#E3AF74')
    },
    planet6 : {
        index: 30,
        size : 0.045 * 0.7,
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
        insideColor: new THREE.Color('#88D3E2'),
        outsideColor: new THREE.Color('#0728A1')
    }
}

let blackHole = new THREE.Object3D()
let blackHoleCenter = null
let blackHoleRing = null
let blackHoleHalo = null
let blackHoleTorusMaterialReflex = null
let nebula = null
let nebula2 = null
let nebula3 = null

let nebula4 = null
let nebula5 = null
let nebula6 = null

let nebula7 = null
let nebula8 = null
let nebula9 = null

const textParams = {
    defaultOpacity: 1,
    defaultScale: 0.6,
    hoverOpacity: 1,
    hoverScale: 0.8
}


function InitAstro() {


    const nebulaGeometry = new THREE.PlaneGeometry(120,120)

    blackHoleTorusMaterialReflex = new THREE.MeshStandardMaterial( {
        //envMap: textureCube,
        roughness: 0.0,
        metalness: 1.0  
    } )
    blackHoleTorusMaterialReflex.mipmaps = false
    const blackHoleRingMaterial = new THREE.MeshBasicMaterial({color: '#f7e5ff'})
    blackHoleRingMaterial.map = blackHoleRingTex
    blackHoleRingMaterial.transparent = true
    const blackHoleHaloMaterial = new THREE.MeshBasicMaterial()

    // const nebulaMaterial = new THREE.MeshBasicMaterial({color: 'cyan'}) 
    // const nebulaMaterial2 = new THREE.MeshBasicMaterial({color: 'blue'}) 
    // const nebulaMaterial3 = new THREE.MeshBasicMaterial({color: '#be51f0'}) 
    // const nebulaMaterial4 = new THREE.MeshBasicMaterial({color: 'blue'}) 
    // const nebulaMaterial5 = new THREE.MeshBasicMaterial({color: 'magenta'}) 
    // const nebulaMaterial6 = new THREE.MeshBasicMaterial({color: 'purple'}) 
    // const nebulaMaterial7 = new THREE.MeshBasicMaterial({color: 'red'}) 
    // const nebulaMaterial8 = new THREE.MeshBasicMaterial({color: 'purple'}) 
    // const nebulaMaterial9 = new THREE.MeshBasicMaterial({color: 'blue'}) 
    // nebulaMaterial.transparent = true
    // nebulaMaterial2.transparent = true
    // nebulaMaterial3.transparent = true
    // nebulaMaterial4.transparent = true
    // nebulaMaterial5.transparent = true
    // nebulaMaterial6.transparent = true
    // nebulaMaterial7.transparent = true
    // nebulaMaterial8.transparent = true
    // nebulaMaterial9.transparent = true
    // nebulaMaterial.map = textureNebula
    // nebulaMaterial2.map = textureNebula
    // nebulaMaterial3.map = textureNebula
    // nebulaMaterial4.map = textureNebula
    // nebulaMaterial5.map = textureNebula
    // nebulaMaterial6.map = textureNebula
    // nebulaMaterial7.map = textureNebula
    // nebulaMaterial8.map = textureNebula
    // nebulaMaterial9.map = textureNebula
    // nebulaMaterial.opacity = 0.15*2
    // nebulaMaterial2.opacity = 0.1*2
    // nebulaMaterial3.opacity = 0.16*2
    // nebulaMaterial4.opacity = 0.15*2
    // nebulaMaterial5.opacity = 0.1*2
    // nebulaMaterial6.opacity = 0.1*2
    // nebulaMaterial7.opacity = 0.12*2
    // nebulaMaterial8.opacity = 0.1*2
    // nebulaMaterial9.opacity = 0.12*2
    // nebulaMaterial.mipmaps = false
    // nebulaMaterial2.mipmaps = false
    // nebulaMaterial3.mipmaps = false
    // nebulaMaterial4.mipmaps = false
    // nebulaMaterial5.mipmaps = false
    // nebulaMaterial6.mipmaps = false
    // nebulaMaterial7.mipmaps = false
    // nebulaMaterial8.mipmaps = false
    // nebulaMaterial9.mipmaps = false


    //Blackhole
    const blackHoleCenterGeometry = new THREE.TorusGeometry(9, 9, 64, 64 );
    //const blackHoleHaloGeometry = new THREE.RingBufferGeometry( 3.6, 6.6, 60, 4);
    const blackHoleHaloGeometry = new THREE.PlaneGeometry(10.2,10.2)
    const blackHoleRingGeometryDisk = new THREE.TorusGeometry( 5, 0.6, 60, 60);


    blackHoleCenter = new THREE.Mesh(blackHoleCenterGeometry, blackHoleTorusMaterialReflex)
    blackHoleRing = new THREE.Mesh(blackHoleRingGeometryDisk, blackHoleRingMaterial)
    blackHoleHalo = new THREE.Mesh(blackHoleHaloGeometry, blackHoleHaloMaterial)
    blackHoleCenter.scale.set(fieldParams.blackHoleSize, fieldParams.blackHoleSize, fieldParams.blackHoleSize * 1.3)
    blackHole.position.set(0, fieldParams.blackHoleHeight, 0)
    scene.add(blackHole)
    scene.add(blackHoleCenter)
    //if (doBloom) 
    scene.add(blackHoleRing)
    scene.add(blackHoleHalo)
    blackHoleCenter.parent = blackHole
    blackHoleHalo.parent = blackHole
    blackHoleRing.parent = blackHole
    //blackHoleRing.parent = blackHole
    blackHoleHalo.position.set(0,0,0)
    //blackHoleRing.position.set(0,0,0)
    blackHoleRing.rotateX(Math.PI/2)
    blackHoleRing.scale.set(1.12, 1.12, 0.4)
    blackHoleHaloMaterial.map = blackHoleGlow
    blackHoleHaloMaterial.alphaMap = blackHoleGlow
    blackHoleHaloMaterial.transparent = true
    blackHoleHaloMaterial.alphaTest = 0.18
    blackHoleHaloMaterial.blending = THREE.AdditiveBlending
    blackHoleHaloMaterial.premultipliedAlpha = true

    // nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial)
    // nebula2 = new THREE.Mesh(nebulaGeometry, nebulaMaterial2)
    // nebula3 = new THREE.Mesh(nebulaGeometry, nebulaMaterial3)
    // nebula4 = new THREE.Mesh(nebulaGeometry, nebulaMaterial4)
    // nebula5 = new THREE.Mesh(nebulaGeometry, nebulaMaterial5)
    // nebula6 = new THREE.Mesh(nebulaGeometry, nebulaMaterial6)
    // nebula7 = new THREE.Mesh(nebulaGeometry, nebulaMaterial7)
    // nebula8 = new THREE.Mesh(nebulaGeometry, nebulaMaterial8)
    // nebula9 = new THREE.Mesh(nebulaGeometry, nebulaMaterial8)
    // nebula.position.set(100*Math.cos(3), 30, 100*Math.sin(3))
    // nebula2.position.set(80*Math.cos(3), -20, 80*Math.sin(3))
    // nebula3.position.set(100*Math.cos(2), 40, 100*Math.sin(2))
    // nebula4.position.set(80*Math.cos(1), 20, 80*Math.sin(1))
    // nebula5.position.set(100*Math.cos(4.5), -0, 100*Math.sin(4.5))
    // nebula6.position.set(120*Math.cos(4.5), -100, 120*Math.sin(4.5))
    // nebula7.position.set(160*Math.cos(0), -40, 130*Math.sin(0))
    // nebula8.position.set(80*Math.cos(0), 0, 80*Math.sin(0))
    // nebula9.position.set(100*Math.cos(6), 10, 100*Math.sin(6))
    // nebula.lookAt(new THREE.Vector3(0,0,0))
    // nebula2.lookAt(new THREE.Vector3(0,0,0))
    // nebula3.lookAt(new THREE.Vector3(0,0,0))
    // nebula4.lookAt(new THREE.Vector3(0,0,0))
    // nebula5.lookAt(new THREE.Vector3(0,0,0))
    // nebula6.lookAt(new THREE.Vector3(0,0,0))
    // nebula7.lookAt(new THREE.Vector3(0,0,0))
    // nebula8.lookAt(new THREE.Vector3(0,0,0))
    // nebula9.lookAt(new THREE.Vector3(0,0,0))
    // const scaler = 1.0
    // nebula.scale.set(1.2*scaler, 1*scaler, 1.4*scaler)
    // nebula2.scale.set(1*scaler, 1*scaler, 1.3*scaler)
    // nebula3.scale.set(1.2*scaler, 1.2*scaler, 1.6*scaler)
    // nebula4.scale.set(1.2*scaler, 1*scaler, 1.4*scaler)
    // nebula5.scale.set(2*scaler, 1*scaler, 1.3*scaler)
    // nebula6.scale.set(2*scaler, 2*scaler, 1.6*scaler)
    // nebula7.scale.set(0.8*scaler, 0.6*scaler, 0.7*scaler)
    // nebula8.scale.set(2.5*scaler, 1.6*scaler, 1.1*scaler)
    // nebula9.scale.set(1.3*scaler, 1.6*scaler, 1*scaler)
    // scene.add(nebula)
    // scene.add(nebula2)
    // scene.add(nebula3)
    // scene.add(nebula4)
    // scene.add(nebula5)
    // scene.add(nebula6)
    // scene.add(nebula7)
    // scene.add(nebula8)
    // scene.add(nebula9)


    for (const myPlanet in planetList) {
        //PLANETS
        const realSize = planetList[myPlanet].size / 2 * fieldParams.fieldSize
        const planetGeometry = new THREE.SphereGeometry(realSize, 30, 30)
        planetList[myPlanet].geometry = planetGeometry
    
        const planetMaterial = new THREE.MeshMatcapMaterial()
        planetMaterial.matcap = planetList[myPlanet].matcap
        //planetMaterial.map = planetList[myPlanet].map
        planetList[myPlanet].material = planetMaterial
    
        const planet = new THREE.Mesh(planetGeometry, planetMaterial)
        planetList[myPlanet].object = planet
        scene.add(planet)

        const labelMat = new THREE.MeshBasicMaterial()
        labelMat.transparent = true
        labelMat.depthTest = true
        labelMat.color = new THREE.Color(0.9,0.9,0.9,1)
        labelMat.map = planetList[myPlanet].label
        labelMat.side = THREE.DoubleSide
        labelMat.opacity = textParams.defaultOpacity
        labelMat.alphaTest = 0.1
        const labelGeo = new THREE.PlaneGeometry(5, 1, 1, 1)
        const labelObj = new THREE.Mesh(labelGeo, labelMat)
        scene.add(labelObj)
        labelObj.parent = planetList[myPlanet].object
        labelObj.position.set(0, planetList[myPlanet].size*fieldParams.fieldSize/2 + 0.8, 0)
        labelObj.scale.set(textParams.defaultScale, textParams.defaultScale, textParams.defaultScale)
        planetList[myPlanet].labelObject = labelObj
    
        //MOONS
        let moonObjects = [] 
        let moonOrbits = [] 
        let moonSpeeds = [] 
        let moonHeight = [] 
        let moonTargetHeight = [] 
        let moonTargetXZ = [] 
        let moonScale = [] 
        for (let i = 0; i < planetList[myPlanet].moonQuantity; i++) {
            const moonSize = realSize * 0.1 * (1 + Math.random())
            const moonGeometry = new THREE.SphereGeometry(moonSize, 30, 30)
    
            const moonMaterial = new THREE.MeshBasicMaterial({color: 'white'})
            moonMaterial.map = textureMoon
    
            const moon = new THREE.Mesh(moonGeometry, moonMaterial)
            moonObjects.push(moon)
            scene.add(moon)
            moon.parent = planetList[myPlanet].object

            moon.rotation.set(Math.random()*360, Math.random()*360, Math.random()*360)
    
            const planetSize = planetList[myPlanet].size * fieldParams.fieldSize
            const orbit = planetSize * 0.6 + (1 + i) * 0.2;
            moonOrbits.push(orbit)
    
            const orbitSpeed =  planetList[myPlanet].orbitSpeed * (Math.random() - 0.5) * 15;
            moonSpeeds.push(orbitSpeed)
    
            const orbitHeight = (Math.random() - 0.5) * planetSize * 0.4
            moonHeight.push(orbitHeight)

            moonTargetHeight.push({y:0})

            moonTargetXZ.push(new Vector2(0,0))

            moonScale.push({x:1})
    
        }
        planetList[myPlanet].moonObjects = moonObjects
        planetList[myPlanet].moonSpeeds = moonSpeeds
        planetList[myPlanet].moonOrbits = moonOrbits
        planetList[myPlanet].moonHeight = moonHeight
        planetList[myPlanet].moonTargetHeight = moonTargetHeight
        planetList[myPlanet].moonTargetXZ = moonTargetXZ
        planetList[myPlanet].moonScale = moonScale
    
    }
}

function UpdateAstro() {   
    for (const myPlanet in planetList) {
        const timer = elapsedTime * planetList[myPlanet].orbitSpeed + planetList[myPlanet].orbitOffset
        const orbitRadius = planetList[myPlanet].orbitRadius
        const posX = orbitRadius * Math.cos(timer) + 0.5
        const posZ = orbitRadius * Math.sin(timer) + 0.5
        planetList[myPlanet].posX = posX
        planetList[myPlanet].posZ = posZ
        planetList[myPlanet].timer = timer
        planetList[myPlanet].object.position.set (
            fieldParams.fieldSize * (posX - 0.5), 
            planetList[myPlanet].orbitHeight + animationParams.planetScale,
            -fieldParams.fieldSize * (posZ - 0.5)
        )
        //planetList[myPlanet].object.rotateY(-0.3*deltaTime)

        const cameraVector = camera.position.clone()
        cameraVector.multiplyScalar(10000)
        planetList[myPlanet].labelObject.lookAt(cameraVector)
        planetList[myPlanet].labelObject.position.set(0, planetList[myPlanet].size*fieldParams.fieldSize/2 + camera.position.y / 50 + 0.2, 0)

        for (let i = 0; i < planetList[myPlanet].moonQuantity; i++) {
            let skip = false
            if (lockedOnPlanet) {
                if (lockedOnPlanet.object.id == planetList[myPlanet].object.id) skip = true
            }
            if (previousLockedPlanet) {
                if (previousLockedPlanet.object.id == planetList[myPlanet].object.id) skip = true
            }
            const orbitSpeed = planetList[myPlanet].moonSpeeds[i]
            if (skip == false) {
                const orbit = planetList[myPlanet].moonOrbits[i]
                planetList[myPlanet].moonObjects[i].position.set(
                    orbit * Math.cos(elapsedTime * orbitSpeed),
                    planetList[myPlanet].moonHeight[i],
                    orbit * Math.sin(elapsedTime * orbitSpeed)
                )
            } else {
                let posX = planetList[myPlanet].moonTargetXZ[i].x
                let posZ = planetList[myPlanet].moonTargetXZ[i].y
                if (currentState == 2) {
                    const orbit = planetList[myPlanet].size * 0.5 * 0.8 * fieldParams.fieldSize
                    posX = orbit * Math.cos(-Math.PI * 0.5 -planetList[myPlanet].timer)
                    posZ = orbit * Math.sin(-Math.PI * 0.5 -planetList[myPlanet].timer)
                }
                planetList[myPlanet].moonObjects[i].position.set(
                    posX,
                    planetList[myPlanet].moonTargetHeight[i].y,
                    posZ
                )
            }
            const moonScale = planetList[myPlanet].moonScale[i].x
            planetList[myPlanet].moonObjects[i].scale.set(
                moonScale, moonScale, moonScale
            )

            planetList[myPlanet].moonObjects[i].rotateX(deltaTime*0.3)
        }

        planetList[myPlanet].labelObject.material.opacity = cameraMotion.labelOpacity

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

    blackHole.lookAt(camera.position)
    blackHoleRing.lookAt(camera.position.x, 0, camera.position.z)
    //blackHoleRing.position.set(0,-2.5,0)
    blackHoleRing.rotateX(33)

    //blackHoleHalo.scale.set(1 + 0.01*Math.sin(elapsedTime*2),1 - 0.01*Math.sin(elapsedTime*1),1)
}





/**
 * MOUSE MOUSE MOUSE MOUSE MOUSE MOUSE MOUSE
 */

 const mouse = new THREE.Vector2()
 let currentIntersect = null
 let lockedOnPlanet = null
 let previousLockedPlanet = null
 let latestClickedObject = null
 let newClick = false

 const pointsOfInterest =  [
    {
        element: document.querySelector('.point-0')
    }
]

 //Listeners

var lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    var now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

document.addEventListener('touchmove', function (event) {
    event.preventDefault();
}, false);

 window.addEventListener('mousemove', (event) =>
 {
    mouse.x = event.clientX / sizes.width * 2 - 1
    mouse.y = - (event.clientY / sizes.height) * 2 + 1
    if (!planetList) return
    // for (const myPlanet in planetList) {
    //     planetList[myPlanet].labelObject.material.opacity = textParams.defaultOpacity
    //     planetList[myPlanet].labelObject.scale.set(textParams.defaultScale, textParams.defaultScale, textParams.defaultScale)
    //     planetList[myPlanet].labelObject.material.needsUpdate = true
    // }
    // if (currentIntersect) {
    //     currentIntersect.labelObject.material.opacity = textParams.hoverOpacity
    //     currentIntersect.labelObject.scale.set(textParams.hoverScale, textParams.hoverScale, textParams.hoverScale)
    //     currentIntersect.labelObject.material.needsUpdate = true
    // }
 })

 window.addEventListener('mousedown', (e) =>
{
    e.stopPropagation()
    e.preventDefault()
    if (!startAnimationRunning && didFetch) newClick = true
    if(currentIntersect)
    {
        latestClickedObject = currentIntersect
    } else {
        latestClickedObject = null
    }
})

window.addEventListener('touchstart', (e) =>
{
   e.stopPropagation()
   e.preventDefault()
   var touch = e.touches[0];
   mouse.x = touch.clientX / sizes.width * 2 - 1
   mouse.y = - (touch.clientY / sizes.height) * 2 + 1
   if (!startAnimationRunning && didFetch) newClick = true
   ProcessMouse()
   if(currentIntersect)
   {
       latestClickedObject = currentIntersect
   } else {
       latestClickedObject = null
   }
})



 //Raycasting
const raycaster = new THREE.Raycaster()

let hoveringBlackHole = false;

function ProcessMouse() {
    raycaster.setFromCamera(mouse, camera)

    const objectsToTest = []
    for (const myPlanet in planetList) {
        objectsToTest.push(planetList[myPlanet].object)
    }
    objectsToTest.push(blackHoleCenter)
    const intersects = raycaster.intersectObjects(objectsToTest)

    if (intersects.length) {
        for (const myPlanet in planetList) {
            if ( planetList[myPlanet].object.id == intersects[0].object.id ) currentIntersect = planetList[myPlanet]
        }
        if (blackHoleCenter.id == intersects[0].object.id) {
            hoveringBlackHole = true
        }
    } else {
        currentIntersect = null
        hoveringBlackHole = false
    } 
}

function UpdateCSS() {
    // for (const point of pointsOfInterest)
    // {
    //     let screenPosition = planetList.planet0.object.position.clone()
    //     screenPosition = screenPosition.add(new THREE.Vector3(0, planetList.planet0.size/2 * fieldParams.fieldSize, 0))
    //     screenPosition.project(camera)

    //     const translateX = screenPosition.x * sizes.width * 0.5
    //     const translateY = - screenPosition.y * sizes.height * 0.5
    //     point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`

    //     raycaster.setFromCamera(screenPosition, camera)
    //     const intersects = raycaster.intersectObject(blackHole)

    //     if (intersects.length === 0) 
    //     {
    //         point.element.classList.add('visible')
    //     } else 
    //     {
    //         const cameraPosition = camera.position.clone()
    //         if (intersects[0].distance < cameraPosition.sub(planetList.planet0.object.position).length())
    //         point.element.classList.remove('visible')
    //     }
    // }
} 



/*
* CAMERA ANIMATION CAMERA ANIMATION CAMERA ANIMATION CAMERA ANIMATION
*/

const cameraParams = {
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
    blackHoleLockHeight: 15
}




/**
 * RENDERING RENDERING RENDERING RENDERING RENDERING RENDERING
 */
 const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

let didResize = false

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    didResize = true
    //renderer.outputEncoding = THREE.sRGBEncoding;

    // effectComposer.setSize(sizes.width, sizes.height)
})

// Base camera
const camera = new THREE.PerspectiveCamera(cameraParams.defaultFOV, sizes.width / sizes.height, 0.1, 500)
camera.position.x = 0
camera.position.y = cameraParams.defaultHeight
camera.position.z = cameraParams.defaultZ
cameraParams.startPositionLenght = camera.position.length()
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target = cameraParams.defaultLook
controls.enableDamping = true
controls.minPolarAngle = 0.08
controls.maxPolarAngle = Math.PI - 0.08
controls.enablePan = false
controls.dampingFactor = 0.04
controls.zoomSpeed = 0.4


// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

//Post processing
// const effectComposer = new EffectComposer(renderer)
// effectComposer.setSize(sizes.width, sizes.height)
// effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// const renderPass = new RenderPass(scene, camera)
// effectComposer.addPass(renderPass)

// const unrealBloomPass = new UnrealBloomPass()
// effectComposer.addPass(unrealBloomPass)

// unrealBloomPass.strength = 1
// unrealBloomPass.radius = 0.00
// unrealBloomPass.threshold = 0.9



function AddGUIStuff () {

    gui.add(fieldParams, 'fieldSize').min(1).max(500).step(0.1).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'lines').min(0).max(400).step(1).onChange(() => {
        destroyLines = true
    })
    
    gui.addColor(fieldColor, 'insideColor').onChange(() => {
        destroyLines = true
    })
    
    gui.addColor(fieldColor, 'outsideColor').onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldColor, 'minimumAlpha').min(0).max(1).step(0.01).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldColor, 'maximumAlpha').min(0).max(1).step(0.01).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'lineResolution').min(0).max(0.1).step(0.0001).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'matrixResolution').min(1).max(500).step(1).name("matrixResolution").onChange(() => {
        destroyLines = true
        InitMatrix()
    })
    
    gui.add(fieldParams, 'blackHoleSize').min(0).max(0.8).step(0.01).onChange(() => {
        blackHoleCenter.scale.set(fieldParams.blackHoleSize, fieldParams.blackHoleSize, fieldParams.blackHoleSize)
    })
    
    gui.add(fieldParams, 'wellSize').min(0).max(300).step(0.01).onChange(() => {
        destroyLines = true
        InitMatrix()
    })
    
    gui.add(fieldParams, 'noise1').min(0).max(50).step(0.1).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'noise2').min(0).max(3.0).step(0.01).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'noise3').min(0).max(5).step(0.1).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'spiralArms').min(0).max(20).step(1).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'spiralAttenuation').min(0).max(20).step(0.1).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'spiralTwist').min(-9).max(9).step(0.1).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'spiralSpeed').min(-5).max(5).step(0.1).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'spiralSize').min(0).max(20).step(0.1).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'dampening').min(1).max(1.1).step(0.001).onChange(() => {
        destroyLines = true
    })
    
    gui.add(fieldParams, 'distorsionMult').min(0).max(10).step(0.1).onChange(() => {
        destroyLines = true
    })
}

let currentState = 0
const cameraMotion = {
    currentPosition: new THREE.Vector3(0,0,0),
    currentFOV: 0,
    timer: 0,
    zoomInDuration: 4,
    lookTarget: new THREE.Vector3(0,0,0),
    uiOpacity: 0,
    labelOpacity: 0,
    blackHoleLockHeight: 0
}
// 0 - orbit
// 1 - on planet
// 2 - changing

gsap.registerPlugin(CustomEase);

CustomEase.create("superSmooth", "M0,0 C0.25,-0.01 0.425,0.414 0.526,0.606 0.646,0.836 0.818,1.001 1,1 ")

CustomEase.create("custom", "M0,0 C0.25,-0.01 0.425,0.414 0.526,0.606 0.646,0.836 0.818,1.001 1,1 ")

gsap.defaults({
    ease: "superSmooth", 
    duration: 1.7,
    delay: 0.0
  });



// function TemporaryUI() {
//     if (lockedOnPlanet) { 
//         UIobject.parent = lockedOnPlanet.object
//         const scale = lockedOnPlanet.size * 120
//         UIobject.scale.set (scale,scale,scale)
//         //pos.add(new THREE.Vector3(0, 0, -10))
//         UIobject.position.set(UIobject.scale.x/3.2, -UIobject.scale.x/4.3, 0)
//         lockedOnPlanet.object.lookAt(camera.position)
//         //UIobject.lookAt(camera.position)
//         let index = 0
//         for (let i = 0; i < lockedOnPlanet.moonQuantity; i++) {
//             lockedOnPlanet.moonObjects[i].position.set(
//                 0.147 * scale,
//                 -0.285 * scale - index*scale * 0.155,
//                 0
//             )
//             index++
//         }
//     }
// }

//0 - free orbit
//1 - moving to planet
//2 - on planet
//3 - moving to orbit

const axesHelper = new THREE.AxesHelper( 5 );
//scene.add( axesHelper );

function CameraTransition(target) {
    if (target == 1) {
        if (currentState == 2) {
            gsap.to(lockedOnPlanet, {orbitHeight: lockedOnPlanet.originalHeight})
            for (let i = 0; i < lockedOnPlanet.moonQuantity; i++) {
                gsap.to(lockedOnPlanet.moonScale[i], {duration: 1, delay: 0, x: 0, onComplete: clearPrevious})
                gsap.to(lockedOnPlanet.moonScale[i], {duration: 0.7, delay: 1, x: 1})
                var element = lockedOnPlanet.moonTargetHeight[i];
                gsap.to(element, {duration: 1.5, y: 0})
            }
            previousLockedPlanet = lockedOnPlanet
        }
        lockedOnPlanet = latestClickedObject
        controls.enabled = false
        cameraMotion.currentPosition = camera.position.clone()
        cameraMotion.currentFOV = camera.fov
        cameraMotion.UIColor = new THREE.Color(0,0,0,0)
        cameraMotion.timer = 0
        cameraMotion.currentRadius = camera.position.clone()
        cameraMotion.currentRadius.projectOnPlane(new THREE.Vector3(0,1,0))
        cameraMotion.currentRadius = cameraMotion.currentRadius.length()
        cameraMotion.lookTarget.set(0, controls.target.y, 0)
        const targetRadius = lockedOnPlanet.orbitRadius * fieldParams.fieldSize + cameraParams.lockRadius

        let projectedVector = camera.position.clone()
        projectedVector.projectOnPlane(new THREE.Vector3(0,1,0))
        let currentAngle = projectedVector.angleTo(new THREE.Vector3(1,0,0))
        if (camera.position.z > 0) currentAngle = 2 * Math.PI - currentAngle
        let targetAngle = (elapsedTime + cameraParams.lockOffsetTime/(lockedOnPlanet.orbitSpeed*lockedOnPlanet.orbitRadius*fieldParams.fieldSize)) * lockedOnPlanet.orbitSpeed + lockedOnPlanet.orbitOffset
        targetAngle = reduceAngle(targetAngle)
        if (Math.abs(currentAngle - targetAngle) > Math.PI) {
            if (targetAngle < currentAngle) targetAngle += 2 * Math.PI
            else if (currentAngle < targetAngle) currentAngle += 2 * Math.PI
        }

        cameraMotion.currentAngle = currentAngle
        lockedOnPlanet.originalHeight = lockedOnPlanet.orbitHeight
        gsap.to(cameraMotion, {currentAngle: targetAngle})
        gsap.to(cameraMotion, {currentRadius: targetRadius})
        gsap.to(lockedOnPlanet, {delay: 0, orbitHeight: cameraParams.lockPlanetHeight})
        cameraMotion.currentPosition.y = camera.position.y
        gsap.to(cameraMotion.currentPosition, {y: cameraParams.lockHeight})
        gsap.to(cameraMotion, {currentFOV: cameraParams.lockFOV})
        gsap.to(cameraMotion, {timer: cameraMotion.zoomInDuration})
        gsap.to(cameraMotion.lookTarget, {y: cameraParams.lookHeight})

        for (let i = 0; i < lockedOnPlanet.moonQuantity; i++) {
            lockedOnPlanet.moonTargetHeight[i].y = lockedOnPlanet.moonHeight[i]
            var element = lockedOnPlanet.moonTargetHeight[i];
            gsap.to(element, {duration: 1.5, y: -2.5 - i * 1.8})

            lockedOnPlanet.moonTargetXZ[i].x = lockedOnPlanet.moonObjects[i].position.x
            lockedOnPlanet.moonTargetXZ[i].y = lockedOnPlanet.moonObjects[i].position.z
            const orbit = lockedOnPlanet.size * 0.5 * 0.8 * fieldParams.fieldSize
            const posX = orbit * Math.cos(-Math.PI * 0.5 -lockedOnPlanet.timer)
            const posZ = orbit * Math.sin(-Math.PI * 0.5 -lockedOnPlanet.timer)
            
            gsap.to(lockedOnPlanet.moonTargetXZ[i], {delay: 0.7, duration: 1, x:  posX})
            gsap.to(lockedOnPlanet.moonTargetXZ[i], {delay: 0.7, duration: 1, y:  posZ})
        }
        gsap.killTweensOf(cameraMotion, "uiOpacity");
        cameraMotion.uiOpacity = 0
        gsap.to(cameraMotion, {delay: 1.3, uiOpacity: 1})
        gsap.to(cameraMotion, {delay: 0, duration: 1, labelOpacity: 0})

        gsap.killTweensOf(fieldParams, "noise1");
        gsap.to(fieldParams, {duration: 15, noise1: (20 + lockedOnPlanet.index*0.7)})
        gsap.to(fieldParams, {duration: 2, distorsionMult: 0})
        gsap.to(fieldParams, {duration: 2, spiralSize: 3})

        const insideC = lockedOnPlanet.insideColor
        const outsideC = lockedOnPlanet.outsideColor
        gsap.to(fieldColor.insideColor, {delay: 0, duration: 1.5, r: insideC.r, g: insideC.g, b: insideC.b})
        gsap.to(fieldColor.outsideColor, {delay: 0, duration: 1.5, r: outsideC.r, g: outsideC.g, b: outsideC.b})
        
        updateCSSData()
        currentState = 1
        return
    } 
    if (currentState == 1 && target == 2) {
        currentState = 2
        return
    } 
    if (target == 3) {
        if (currentState == 2) {
            for (let i = 0; i < lockedOnPlanet.moonQuantity; i++) {
                gsap.to(lockedOnPlanet.moonScale[i], {duration: 1, delay: 0, x: 0})
                gsap.to(lockedOnPlanet.moonScale[i], {duration: 1.5, delay: 1.2, x: 1, onStart: clearPrevious})
                
            lockedOnPlanet.moonTargetXZ[i].x = lockedOnPlanet.moonObjects[i].position.x
            lockedOnPlanet.moonTargetXZ[i].y = lockedOnPlanet.moonObjects[i].position.z
            gsap.to(lockedOnPlanet.moonTargetXZ[i], {delay: i * 0.3, duration: 1 - i * 0.1, x:  0, y:  0})
            }
            previousLockedPlanet = lockedOnPlanet
            lockedOnPlanet = null
        }
        let projectedVector = camera.position.clone()
        projectedVector.projectOnPlane(new THREE.Vector3(0,1,0))
        cameraMotion.currentAngle = projectedVector.angleTo(new THREE.Vector3(1,0,0))
        cameraMotion.UIColor = new THREE.Color(0,0,0,0)
        gsap.to(previousLockedPlanet, {orbitHeight: previousLockedPlanet.originalHeight})
        cameraMotion.timer = 0
        cameraMotion.lookTarget.setY(controls.target.y)
        gsap.to(cameraMotion, {timer: cameraMotion.zoomInDuration})
        let targetPosition = camera.position.clone()
        targetPosition.normalize()
        targetPosition = targetPosition.multiplyScalar(cameraParams.startPositionLenght)
        targetPosition.setY(cameraParams.defaultHeight)
        gsap.to(cameraMotion.currentPosition, {duration: 1.7, delay: 0, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z})
        gsap.to(cameraMotion.lookTarget, {duration: 1.7, delay: 0, y: cameraParams.defaultLook.y})
        gsap.to(cameraMotion, {duration: 1.7, delay: 0, currentFOV: cameraParams.defaultFOV})

        gsap.killTweensOf(cameraMotion, "uiOpacity");
        gsap.to(cameraMotion, {delay: 0, duration: 1, uiOpacity: 0})
        gsap.to(cameraMotion, {delay: 1, duration: 0.7, labelOpacity: 1})
        gsap.killTweensOf(fieldParams, "noise1");
        gsap.to(fieldParams, {noise1: 0.8})
        gsap.to(fieldParams, {duration: 5, distorsionMult: 3})

        const insideC = fieldColor.startInsideColor
        const outsideC = fieldColor.startOutsideColor
        gsap.to(fieldColor.insideColor, {delay: 0, duration: 1.0, r: insideC.r, g: insideC.g, b: insideC.b})
        gsap.to(fieldColor.outsideColor, {delay: 0, duration: 1.0, r: outsideC.r, g: outsideC.g, b: outsideC.b})
        gsap.to(fieldParams, {duration: 2, spiralSize: 11.8})

        currentState = 3
        return
    }
    if (target == 0) {
        controls.enabled = true
        previousLockedPlanet = lockedOnPlanet
        lockedOnPlanet = null
        currentState = 0

        gsap.killTweensOf(cameraMotion, "labelOpacity")
        return
    }
    if (target == 5) {
        let projectedVector = camera.position.clone()
        projectedVector.projectOnPlane(new THREE.Vector3(0,1,0))
        cameraMotion.currentAngle = projectedVector.angleTo(new THREE.Vector3(1,0,0))
        //cameraMotion.timer = 0
        let targetPosition = camera.position.clone()
        projectedVector.normalize()
        let target = 110
        if (isMobile) target = 150
        targetPosition = projectedVector.multiplyScalar(target)
        targetPosition.setY(cameraParams.defaultHeight-10)
        cameraMotion.currentPosition = camera.position.clone()
        gsap.to(cameraMotion.currentPosition, {duration: 1.7, delay: 0, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, onComplete: SetBlackHoleLockedState})

        cameraMotion.lookTarget = controls.target.clone()
        cameraMotion.blackHoleLockHeight = blackHole.position.y
        //cameraMotion.lookTarget = blackHole.position.clone()
        gsap.to(cameraMotion.lookTarget, {y: cameraParams.blackHoleLookHeight})
        let target2 = 21
        if (isMobile) target2 = 27
        gsap.to(cameraMotion, {blackHoleLockHeight: target2})


        let target3 = 38
        if (isMobile) target3 = 32

        document.body.appendChild(line1Field)
        document.body.appendChild(line2Field)
        line1Field.style.top = target3 + "vh"
        line2Field.style.top = target3 + 5 + "vh"
        line2Field.style.fontSize = 1.0 + "vh"
        line2Field.style.lineHeight = 3 + "vh"
        line2Field.style.paddingLeft = 10 + "vw"
        line2Field.style.paddingRight = 10 + "vw"
        //line2Field.innerHTML = ""
        line3Field.style.fontSize = 1.5 + "vh"
        line3Field.style.lineHeight = 3 + "vh"
        line3Field.style.paddingLeft = 10 + "vw"
        line3Field.style.paddingRight = 10 + "vw"
        line2Field.style.fontWeight = 200
        line2Field.innerHTML = "Enabling lightspeed-fast analytics at enterprise scale. <br> Join on-chain and off-chain data in a single query, <br> with verifiable tamperproofing and cryptographic guarantees"
        gsap.killTweensOf(line1Field.style, "opacity")
        gsap.killTweensOf(line2Field.style, "opacity")
        gsap.killTweensOf(line3Field.style, "opacity")
        gsap.to(line1Field.style, {duration: 0.5, delay: 0.3, ease:"power1", opacity: 1})
        gsap.to(line2Field.style, {duration: 0.5, delay: 0.3, ease:"power1", opacity: 1})
        gsap.to(line3Field.style, {duration: 0.5, delay: 0.3, ease:"power1", opacity: 1})

        currentState = 5
        newClick = false
    }
    if (target == 6 && currentState == 7) {
        gsap.to(line1Field.style, {duration: 0.5, delay: 0, ease:"power1", opacity: 0})
        gsap.to(line2Field.style, {duration: 0.5, delay: 0, ease:"power1", opacity: 0})
        gsap.to(line3Field.style, {duration: 0.5, delay: 0, ease:"power1", opacity: 0, onComplete: RemoveTitleField})
        gsap.to(cameraMotion.lookTarget, {y: 0})
        gsap.to(cameraMotion, {blackHoleLockHeight: fieldParams.blackHoleHeight, onComplete: returnToStateZero})
        controls.enabled = true
        currentState = 6
    }
}

function SetBlackHoleLockedState() {
    currentState = 7
}

function returnToStateZero() {
    currentState = 0
}

function reduceAngle(angle) {
    while (angle > 2 * Math.PI) angle -= 2 * Math.PI
    while (angle < -2 * Math.PI) angle += 2 * Math.PI
    return angle
}

function clearPrevious() {
    previousLockedPlanet = null
}

function CameraState() {
    if (currentState == 0) { //free orbit
        lockedOnPlanet = null
        previousLockedPlanet = null
        if (newClick) {
            newClick = false
            if (latestClickedObject) CameraTransition(1)
            else if (hoveringBlackHole) CameraTransition(5)
        }
        return
    }
    if (currentState == 1) { //moving to planet
        cameraMotion.currentPosition.x = cameraMotion.currentRadius * Math.cos(cameraMotion.currentAngle) 
        cameraMotion.currentPosition.z = -cameraMotion.currentRadius * Math.sin(cameraMotion.currentAngle) 
        camera.position.set(cameraMotion.currentPosition.x, cameraMotion.currentPosition.y, cameraMotion.currentPosition.z)
        controls.target = new THREE.Vector3(cameraMotion.lookTarget.x, cameraMotion.lookTarget.y, cameraMotion.lookTarget.z)
        camera.fov = cameraMotion.currentFOV
        camera.updateProjectionMatrix()
        //UIobject.material.color = cameraMotion.UIColor
        elapsedTime -= deltaTime
        if (newClick) newClick = false
        if (cameraMotion.timer >= cameraMotion.zoomInDuration) CameraTransition(2)
    }
    if (currentState == 2) { //tracking planet
        if (newClick) {
            newClick = false
            if (latestClickedObject && latestClickedObject.object.id != lockedOnPlanet.object.id) CameraTransition(1)
            if (!latestClickedObject) CameraTransition(3)
            return
        }
        const timer = lockedOnPlanet.orbitSpeed * (elapsedTime + cameraParams.lockOffsetTime/(lockedOnPlanet.orbitSpeed*lockedOnPlanet.orbitRadius*fieldParams.fieldSize)) + lockedOnPlanet.orbitOffset

        cameraMotion.currentPosition.x = cameraMotion.currentRadius * Math.cos(timer) 
        cameraMotion.currentPosition.z = -cameraMotion.currentRadius * Math.sin(timer) 
        camera.position.set(cameraMotion.currentPosition.x, cameraMotion.currentPosition.y, cameraMotion.currentPosition.z)
        return
    }
    if (currentState == 3) { //moving to orbit
        camera.position.set(cameraMotion.currentPosition.x, cameraMotion.currentPosition.y, cameraMotion.currentPosition.z)
        controls.target = new THREE.Vector3(cameraMotion.lookTarget.x, cameraMotion.lookTarget.y, cameraMotion.lookTarget.z)
        camera.fov = cameraMotion.currentFOV
        camera.updateProjectionMatrix()
        if (cameraMotion.timer >= cameraMotion.zoomInDuration) CameraTransition(0)
    }
    if (currentState == 5) { //locking on black hole
        camera.position.set(cameraMotion.currentPosition.x, cameraMotion.currentPosition.y, cameraMotion.currentPosition.z)
        controls.target = new THREE.Vector3(cameraMotion.lookTarget.x, cameraMotion.lookTarget.y, cameraMotion.lookTarget.z)
        blackHole.position.set(0, cameraMotion.blackHoleLockHeight, 0)
        if (newClick) {
            newClick = false
        }
    }
    if (currentState == 6) { //coming back from black hole
        controls.target = new THREE.Vector3(cameraMotion.lookTarget.x, cameraMotion.lookTarget.y, cameraMotion.lookTarget.z)
        blackHole.position.set(0, cameraMotion.blackHoleLockHeight, 0)
        if (newClick) {
            newClick = false
        }
    }
    if (currentState == 7) {
        if (newClick) { 
            CameraTransition(6)
        }
    }
} 

/**
 * GAME LOOP GAME LOOP GAME LOOP GAME LOOP GAME LOOP GAME LOOP
 */
const clock = new THREE.Clock(true)
let elapsedTime = 0
let deltaTime = 0
let timeModifier = 1
let count = 0

//AddGUIStuff()
InitLines()
InitAstro()


function toXYCoords (position) {
    let screenposition = position.clone()
    screenposition.project(camera)
    let pos = new Vector2(0,0)
    pos.x = screenposition.x * sizes.width * 0.5
    pos.y = - screenposition.y * sizes.height * 0.5
    return pos;
}

let textField = document.createElement('div');
let textTitle = document.createElement('div');
let textDescription = document.createElement('div');
let textPrice = document.createElement('div');
let textMoon1 = document.createElement('div');
let textMoon1Title = document.createElement('div');
let textMoon1Price = document.createElement('div');
let textMoon2 = document.createElement('div');
let textMoon2Title = document.createElement('div');
let textMoon2Price = document.createElement('div');
let textMoon3 = document.createElement('div');
let textMoon3Title = document.createElement('div');
let textMoon3Price = document.createElement('div');
let textMoon4 = document.createElement('div');
let textMoon4Title = document.createElement('div');
let textMoon4Price = document.createElement('div');
let textChainlinkExtra = document.createElement('div');

createCSSDescription()

function createCSSDescription() {

    textField = document.createElement('div');
    textField.style.position = 'absolute';
    textField.style.color = "white"
    textField.style.transform = "translate(0,-50%)";
    textField.style.opacity = 0
    textField.style.fontFamily = "Inter, sans-serif"
    document.body.appendChild(textField);

    textTitle = document.createElement('div');
    textTitle.innerHTML = "Ethereum";
    textTitle.style.fontSize = 2.8 + 'vh';
    textTitle.style.textTransform = "uppercase"
    textTitle.style.letterSpacing = 0.2 + "em"
    textTitle.style.fontWeight = 400
    textField.appendChild(textTitle);

    textDescription = document.createElement('div');
    textDescription.innerHTML = "24h % token variation";
    textDescription.style.marginTop = 5 + 'px';
    textDescription.style.fontSize = 1.6 + 'vh';
    textDescription.style.fontWeight = 200
    textDescription.style.marginBottom = 1 + 'vh'
    textField.appendChild(textDescription);

    textPrice = document.createElement('div')
    textPrice.style.fontSize = 1.6 + 'vh'
    textPrice.style.padding = 0.8 + 'vh'
    textPrice.style.border = "1px solid white"
    textPrice.style.textAlign = "left"
    textPrice.style.display = "inline-block"
    textPrice.style.fontFamily = "JetBrains Mono, monospace"
    textField.appendChild(textPrice);

    textChainlinkExtra = document.createElement('div');
    textChainlinkExtra.innerHTML = "<br>Space and Time will leverage Chainlink services such as Off-Chain Reporting to validate the results of decentralized, trust-minimized queries. <br><br> Chainlink is building a robust ecosystem including top projects like Krypton, Truflation, dClimate, and ReputationDAO";
    textChainlinkExtra.style.marginTop = 10 + 'px';
    textChainlinkExtra.style.fontSize = 1.6 + 'vh';
    textChainlinkExtra.style.fontWeight = 200
    textChainlinkExtra.style.marginBottom = 1 + 'vh'
    textChainlinkExtra.style.marginRight = 10 + 'vw'
    textField.appendChild(textChainlinkExtra);

    textMoon1 = document.createElement('div');
    textMoon1.style.fontFamily = "Inter, sans-serif"
    textMoon1.style.position = 'absolute';
    textMoon1.style.color = "white"
    textMoon1.style.transform = "translate(0,-30%)";
    textMoon1.style.opacity = 0
    document.body.appendChild(textMoon1);

    textMoon1Title = document.createElement('div');
    textMoon1Title.style.fontSize = 1.9 + 'vh';
    textMoon1Title.style.textTransform = "uppercase"
    textMoon1Title.style.letterSpacing = 0.2 + "em"
    textMoon1Title.style.fontWeight = 400
    textMoon1Title.style.paddingBottom = 0.8 + 'vh'
    textMoon1.appendChild(textMoon1Title);

    textMoon1Price = document.createElement('div');
    textMoon1Price.style.fontSize = 1.6 + 'vh'
    textMoon1Price.style.padding = 0.8 + 'vh'
    textMoon1Price.style.border = "1px solid white"
    textMoon1Price.style.textAlign = "left"
    textMoon1Price.style.display = "inline-block"
    textMoon1Price.style.fontFamily = "JetBrains Mono, monospace"
    textMoon1.appendChild(textMoon1Price);

    textMoon2 = document.createElement('div');
    textMoon2.style.fontFamily = "Inter, sans-serif"
    textMoon2.style.position = 'absolute';
    textMoon2.style.color = "white"
    textMoon2.style.transform = "translate(0,-30%)";
    textMoon2.style.opacity = 0
    document.body.appendChild(textMoon2);

    textMoon2Title = document.createElement('div');
    textMoon2Title.style.fontSize = 1.9 + 'vh';
    textMoon2Title.style.textTransform = "uppercase"
    textMoon2Title.style.letterSpacing = 0.2 + "em"
    textMoon2Title.style.fontWeight = 400
    textMoon2Title.style.paddingBottom = 0.8 + 'vh'
    textMoon2.appendChild(textMoon2Title);

    textMoon2Price = document.createElement('div');
    textMoon2Price.style.fontSize = 1.6 + 'vh'
    textMoon2Price.style.padding = 0.8 + 'vh'
    textMoon2Price.style.border = "1px solid white"
    textMoon2Price.style.textAlign = "left"
    textMoon2Price.style.display = "inline-block"
    textMoon2Price.style.fontFamily = "JetBrains Mono, monospace"
    textMoon2.appendChild(textMoon2Price);

    textMoon3 = document.createElement('div');
    textMoon3.style.fontFamily = "Inter, sans-serif"
    textMoon3.style.position = 'absolute';
    textMoon3.style.color = "white"
    textMoon3.style.transform = "translate(0,-30%)";
    textMoon3.style.opacity = 0
    document.body.appendChild(textMoon3);

    textMoon3Title = document.createElement('div');
    textMoon3Title.style.fontSize = 1.9 + 'vh';
    textMoon3Title.style.textTransform = "uppercase"
    textMoon3Title.style.letterSpacing = 0.2 + "em"
    textMoon3Title.style.fontWeight = 400
    textMoon3Title.style.paddingBottom = 0.8 + 'vh'
    textMoon3.appendChild(textMoon3Title);

    textMoon3Price = document.createElement('div');
    textMoon3Price.style.fontSize = 1.6 + 'vh'
    textMoon3Price.style.padding = 0.8 + 'vh'
    textMoon3Price.style.border = "1px solid white"
    textMoon3Price.style.textAlign = "left"
    textMoon3Price.style.display = "inline-block"
    textMoon3Price.style.fontFamily = "JetBrains Mono, monospace"
    textMoon3.appendChild(textMoon3Price);

    textMoon4 = document.createElement('div');
    textMoon4.style.fontFamily = "Inter, sans-serif"
    textMoon4.style.position = 'absolute';
    textMoon4.style.color = "white"
    textMoon4.style.transform = "translate(0,-30%)";
    textMoon4.style.opacity = 0
    document.body.appendChild(textMoon4);

    textMoon4Title = document.createElement('div');
    textMoon4Title.style.fontSize = 1.9 + 'vh';
    textMoon4Title.style.textTransform = "uppercase"
    textMoon4Title.style.letterSpacing = 0.2 + "em"
    textMoon4Title.style.fontWeight = 400
    textMoon4Title.style.paddingBottom = 0.8 + 'vh'
    textMoon4.appendChild(textMoon4Title);

    textMoon4Price = document.createElement('div');
    textMoon4Price.style.fontSize = 1.6 + 'vh'
    textMoon4Price.style.padding = 0.8 + 'vh'
    textMoon4Price.style.border = "1px solid white"
    textMoon4Price.style.textAlign = "left"
    textMoon4Price.style.display = "inline-block"
    textMoon4Price.style.fontFamily = "JetBrains Mono, monospace"
    textMoon4.appendChild(textMoon4Price);
}

function UpdateCSSDescription () {
    if (lockedOnPlanet) {
        if (currentState == 1 || didResize) {
            didResize = false
            let screenPosition = lockedOnPlanet.object.position.clone()
            screenPosition.project(camera)

            const xPos = 49 + '%'

            textField.style.left = xPos
            textField.style.top = (-screenPosition.y + 1) * 0.5 * sizes.height + 'px'

            if (lockedOnPlanet.index == 30) {
                if (textChainlinkExtra.parentElement != textField) textField.appendChild(textChainlinkExtra);
                textField.style.transform = "translate(0,-23%)";
            } else {
                if (textChainlinkExtra.parentElement === textField) textField.removeChild(textChainlinkExtra);
                textField.style.transform = "translate(0,-50%)";
            }

            if (lockedOnPlanet.moonQuantity > 0) {
                let screenMoon1Position = new THREE.Vector3(0,0,0)
                lockedOnPlanet.moonObjects[0].getWorldPosition(screenMoon1Position)
                screenMoon1Position.project(camera)
                textMoon1.style.left = xPos
                textMoon1.style.top = (-screenMoon1Position.y + 1) * 0.5 * sizes.height + 'px'
            } else {
                textMoon1.style.left = 10000 + "px"
            }

            if (lockedOnPlanet.moonQuantity > 1) {
                let screenMoon2Position = new THREE.Vector3(0,0,0)
                lockedOnPlanet.moonObjects[1].getWorldPosition(screenMoon2Position)
                screenMoon2Position.project(camera)
                textMoon2.style.left = xPos
                textMoon2.style.top = (-screenMoon2Position.y + 1) * 0.5 * sizes.height + 'px'
            } else {
                textMoon2.style.left = 10000 + "px"
            }

            if (lockedOnPlanet.moonQuantity > 2) {
                let screenMoon3Position = new THREE.Vector3(0,0,0)
                lockedOnPlanet.moonObjects[2].getWorldPosition(screenMoon3Position)
                screenMoon3Position.project(camera)
                textMoon3.style.left = xPos
                textMoon3.style.top = (-screenMoon3Position.y + 1) * 0.5 * sizes.height + 'px'
            } else {
                textMoon3.style.left = 10000 + "px"
            }

            if (lockedOnPlanet.moonQuantity > 3) {
                let screenMoon4Position = new THREE.Vector3(0,0,0)
                lockedOnPlanet.moonObjects[3].getWorldPosition(screenMoon4Position)
                screenMoon4Position.project(camera)
                textMoon4.style.left = xPos
                textMoon4.style.top = (-screenMoon4Position.y + 1) * 0.5 * sizes.height + 'px'
            } else {
                textMoon4.style.left = 10000 + "px"
            }
        }
    } else {
        textField.style.left = 10000 + "px"
        textMoon1.style.left = 10000 + "px"
        textMoon2.style.left = 10000 + "px"
        textMoon3.style.left = 10000 + "px"
        textMoon4.style.left = 10000 + "px"
    }

    textField.style.opacity = cameraMotion.uiOpacity;
    textMoon1.style.opacity = cameraMotion.uiOpacity;
    textMoon2.style.opacity = cameraMotion.uiOpacity;
    textMoon3.style.opacity = cameraMotion.uiOpacity;
    textMoon4.style.opacity = cameraMotion.uiOpacity;
}

//updateAPI()
fetchAPI()

let coinValues = null
let didFetch = false

function updateAPI() {
    let url = 'https://ancient-garden-81017.herokuapp.com/graph';
    
    fetch(url)
}

function fetchAPI() {
    let url = 'https://ancient-garden-81017.herokuapp.com/arquivo.json';
    
    fetch(url)
    .then(res => {return res.json()})
    .then((out) => {
        didFetch = true
        coinValues = out
        //console.log(coinValues);
        gsap.to(line4Field.style, {duration: 0.5, delay: 0, ease:"power1", opacity: 0, onComplete: changeTouchToInteractText})
        gsap.to(line4Field.style, {duration: 2, delay: 0.5, ease:"power1", opacity: 1})
        gsap.to(cameraMotion, {delay: 0, duration: 1, labelOpacity: 1})
        //console.log(coinValues[0][0].name);
    })
}

function changeTouchToInteractText() {
    line4Field.style.fontSize = 16 + 'px';
    line4Field.innerHTML = "touch to interact"
}

function updateCSSData() {
    if (didFetch) {
        let variation = 0
        let symbol = 0

        let index = lockedOnPlanet.index
        if (coinValues[index][0]) {
            textTitle.innerHTML = coinValues[index][0].name;
            if (index == 10) textTitle.innerHTML= "binance"
            variation = coinValues[index][0].quote.USD.percent_change_24h.toFixed(1)
            if (variation > 0) symbol = "&#x2191;"
            else symbol = "&#x2193;"
            textPrice.innerHTML = "$"+coinValues[index][0].quote.USD.price.toFixed(1) +"&nbsp;" + symbol + Math.abs(variation) + "%"
        } else {
            textTitle.innerHTML = "-"
            textPrice.innerHTML = "data unavailable"
        }

        index++
        if (lockedOnPlanet.moonQuantity < 1) return

        if (coinValues[index][0]) {
            textMoon1Title.innerHTML = coinValues[index][0].name;
            variation = coinValues[index][0].quote.USD.percent_change_24h.toFixed(1)
            if (variation > 0) symbol = "&#x2191;"
            else symbol = "&#x2193;"
            let price = getPrice(coinValues[index][0].quote.USD.price)
            textMoon1Price.innerHTML = "$"+price +"&nbsp;" + symbol + Math.abs(variation) + "%"
        } else {
            textMoon1Title.innerHTML = "-"
            textMoon1Price.innerHTML = "data unavailable"
        }

        index++
        if (lockedOnPlanet.moonQuantity < 2) return

        if (coinValues[index][0]) {
            textMoon2Title.innerHTML = coinValues[index][0].name;
            variation = coinValues[index][0].quote.USD.percent_change_24h.toFixed(1)
            if (variation > 0) symbol = "&#x2191;"
            else symbol = "&#x2193;"
            let price = getPrice(coinValues[index][0].quote.USD.price)
            textMoon2Price.innerHTML = "$"+price +"&nbsp;" + symbol + Math.abs(variation) + "%"
        } else {
            textMoon2Title.innerHTML = "-"
            textMoon2Price.innerHTML = "data unavailable"
        }

        index++
        if (lockedOnPlanet.moonQuantity < 3) return

        if (coinValues[index][0]) {
            textMoon3Title.innerHTML = coinValues[index][0].name;
            variation = coinValues[index][0].quote.USD.percent_change_24h.toFixed(1)
            if (variation > 0) symbol = "&#x2191;"
            else symbol = "&#x2193;"
            let price = getPrice(coinValues[index][0].quote.USD.price)
            textMoon3Price.innerHTML = "$" + price + "&nbsp;" + symbol + Math.abs(variation) + "%"
        } else {
            textMoon3Title.innerHTML = "-"
            textMoon3Price.innerHTML = "data unavailable"
        }
        
        index++
        if (lockedOnPlanet.moonQuantity < 4) return

        if (coinValues[index][0]) {
            textMoon4Title.innerHTML = coinValues[index][0].name;
            variation = coinValues[index][0].quote.USD.percent_change_24h.toFixed(1)
            if (variation > 0) symbol = "&#x2191;"
            else symbol = "&#x2193;"
            let price = getPrice(coinValues[index][0].quote.USD.price)
            textMoon4Price.innerHTML = "$"+price +"&nbsp;" + symbol + Math.abs(variation) + "%"
        } else {
            textMoon4Title.innerHTML = "-"
            textMoon4Price.innerHTML = "data unavailable"
        }

        // if (lockedOnPlanet.index == 30) {
            
        // }
    }
}

function getPrice(priceString) {
    let price = 0
    price = priceString.toFixed(1)
    if (price <= 0.1) {
        price = priceString.toFixed(2)
        if (price <= 0.01) {
            price = priceString.toFixed(3)
            if (price <= 0.001) {
                price = priceString.toFixed(4)
                if (price <= 0.0001) {
                    price = priceString.toFixed(5)
                }
            }
        }
    } 
    return price
} 


var fps = []
let criticalFPS = 0

fpsInit()

function fpsInit() {
    for (let index = 0; index < 60; index++) {
        fps.push(80)
    }
}


function fpsLogger() {
    if (criticalFPS < 5) {
        fps.push(1/deltaTime)
        fps.shift()

        const sum = fps.reduce((a, b) => a + b, 0);
        const avg = (sum / fps.length) || 0;

        if (avg < 40) {
            criticalFPS++
            fpsInit()
        }
    }
}

let startAnimationRunning = false

const animationParams = {
    planetScale: 1,
    ringScale: 1,
    blackHoleY: 0,
    spiralSize: 0
}

let line1Field = document.createElement('div');
let line2Field = document.createElement('div');
let line3Field = document.createElement('div');
let line4Field = document.createElement('div');

function StartAnimation () {
    startAnimationRunning = true
    const startCameraZ = cameraParams.defaultZ
    const startCameraHeight = cameraParams.defaultHeight
    const startFieldSize =  fieldParams.fieldSize
    const startAlpha =  fieldColor.maximumAlpha
    fieldColor.maximumAlpha = 0
    fieldParams.blackHoleSize = 1
    cameraParams.defaultZ = 0
    cameraParams.defaultHeight = 50
    fieldParams.fieldSize = 250
    controls.enabled = false
    animationParams.ringScale = 0

    gsap.to(fieldParams, {duration: 4.5, ease:"power1", delay: 0, fieldSize: startFieldSize})
    gsap.to(fieldColor, {duration: 4, delay: 0, ease:"power1", maximumAlpha: startAlpha})
    gsap.to(cameraParams, {duration: 3.5, ease:"power1", delay: 0, defaultHeight: startCameraHeight})
    gsap.to(cameraParams, {duration: 4, delay: 0, defaultZ: startCameraZ})
    //gsap.to(animationParams, {duration: 3, ease:"power1", delay: 4, ringScale: 1})



    animationParams.distorsionMult = fieldParams.distorsionMult
    fieldParams.distorsionMult = 0
    gsap.to(fieldParams, {duration: 1, ease:"power1", delay: 1, distorsionMult: animationParams.distorsionMult})

    animationParams.minimumAlpha = fieldColor.minimumAlpha
    fieldColor.minimumAlpha = 0
    gsap.to(fieldColor, {duration: 2, ease:"power1", delay: 2, minimumAlpha: animationParams.minimumAlpha})

    animationParams.wellSize = fieldParams.wellSize
    fieldParams.wellSize = -2
    gsap.to(fieldParams, {duration: 2, ease:"power1", delay: 3, wellSize: animationParams.wellSize})

    animationParams.spiralSize = fieldParams.spiralSize
    fieldParams.spiralSize = 0
    gsap.to(fieldParams, {duration: 3, ease:"power1", delay: 2.7, spiralSize: animationParams.spiralSize})

    animationParams.blackHoleY = 50
    gsap.to(animationParams, {duration: 4, ease:"power1", blackHoleY: fieldParams.blackHoleHeight, onComplete: EndAnimation})

    line1Field = document.createElement('div');
    line1Field.innerHTML = "space and time"
    line1Field.style.position = 'absolute';
    line1Field.style.color = "white"
    line1Field.style.opacity = 0
    line1Field.style.fontFamily = "Inter, sans-serif"
    line1Field.style.textAlign = "center"
    line1Field.style.left = 0 + "%"
    line1Field.style.right = 0 + "%"
    line1Field.style.top = 14 + "vh"
    line1Field.style.display = "block"
    line1Field.style.fontSize = 20 + 'px';
    line1Field.style.textTransform = "uppercase"
    line1Field.style.fontWeight = "200";
    line1Field.style.letterSpacing = 0.2 + "em"
    document.body.appendChild(line1Field);

    gsap.to(line1Field.style, {duration: 0.5, delay: 0.2, ease:"power1", opacity: 1})
    gsap.to(line1Field.style, {duration: 5, delay: 1, ease:"power1", opacity: 0, onComplete: RemoveTitleField})

    line2Field = document.createElement('div');
    line2Field.style.position = 'absolute';
    line2Field.style.color = "white"
    line2Field.style.opacity = 0
    line2Field.style.fontFamily = "Inter, sans-serif"
    line2Field.style.textAlign = "center"
    line2Field.innerHTML = "the first decentralized <br> data warehouse"
    line2Field.style.left = 0 + "%"
    line2Field.style.right = 0 + "%"
    line2Field.style.top = 18 + "vh"
    line2Field.style.fontSize = 30 + 'px';
    line2Field.style.lineHeight = 40 + 'px';
    line2Field.style.textTransform = "uppercase"
    line2Field.style.letterSpacing = 0.2 + "em"
    document.body.appendChild(line2Field);
    
    gsap.to(line2Field.style, {duration: 0.5, delay: 0.2, ease:"power1", opacity: 1})
    gsap.to(line2Field.style, {duration: 4, delay: 1.5, ease:"power1", opacity: 0})

    line3Field = document.createElement('div');
    line3Field.style.position = 'relative';
    line3Field.style.color = "white"
    line3Field.style.opacity = 1
    line3Field.style.fontFamily = "Inter, sans-serif"
    line3Field.style.textAlign = "center"
    line3Field.innerHTML = "Enabling lightspeed-fast analytics at enterprise scale"
    line3Field.style.left = 0 + "%"
    line3Field.style.right = 0 + "%"
    line3Field.style.bottom = 0 + "%"
    line3Field.style.top = 0 + "%"
    line3Field.style.paddingLeft = 10 + "px"
    line3Field.style.paddingRight = 10 + "px"
    line3Field.style.paddingTop = 6 + "px"
    line3Field.style.fontSize = 20 + 'px';
    line3Field.style.textTransform = "uppercase"
    line3Field.style.fontWeight = "200";
    line3Field.style.lineHeight = 40 + 'px';
    line3Field.style.letterSpacing = 0.2 + "em"
    line2Field.appendChild(line3Field);
    
    //gsap.to(line3Field.style, {duration: 0.5, delay: 0.2, ease:"power1", opacity: 1})
    //gsap.to(line3Field.style, {duration: 5, delay: 1, ease:"power1", opacity: 0})

    line4Field = document.createElement('div');
    //line4Field.innerHTML = "touch to interact"
    line4Field.innerHTML = "fetching data..."
    line4Field.style.position = 'absolute';
    line4Field.style.color = "white"
    line4Field.style.opacity = 0
    line4Field.style.fontFamily = "Inter, sans-serif"
    line4Field.style.textAlign = "center"
    line4Field.style.left = 0 + "%"
    line4Field.style.right = 0 + "%"
    line4Field.style.bottom = 0 + "%"
    line4Field.style.paddingBottom = 4 + "vh"
    line4Field.style.display = "block"
    line4Field.style.fontSize = 12 + 'px';
    line4Field.style.textTransform = "uppercase"
    line4Field.style.fontWeight = "200";
    line4Field.style.letterSpacing = 0.2 + "em"
    document.body.appendChild(line4Field);

    gsap.to(line4Field.style, {duration: 0.5, delay: 1, ease:"power1", opacity: 1})
    //gsap.to(line4Field.style, {duration: 3, delay: 5, ease:"power1", opacity: 0, onComplete: RemoveInteractField})

}

function EndAnimation () {
    controls.enabled = true
    startAnimationRunning = false
    controls.maxDistance = 200
    controls.minDistance = 50
}

function RemoveTitleField () {
    document.body.removeChild(line1Field)
    document.body.removeChild(line2Field)
}

function RemoveInteractField () {
    document.body.removeChild(line4Field)
}

function AnimationUpdate() {
    if (startAnimationRunning) {
        camera.position.set(0, cameraParams.defaultHeight, cameraParams.defaultZ)
        blackHole.position.set(0, animationParams.blackHoleY, 0)
        controls.target = blackHole.position.clone()
    }
}

let isMobile = false

function MobileDetection() {
    if (sizes.height > sizes.width) {
        cameraParams.defaultZ *= 1.3
        cameraParams.defaultHeight *= 1.8
        isMobile = true
    }
}

MobileDetection()

StartAnimation()

const tick = () =>
{

    // elapsedTime = clock.getElapsedTime()
    deltaTime  = clock.getDelta()
    elapsedTime += deltaTime


    if (destroyLines) {
        InitLines()
        destroyLines = false;
    }
    AnimationUpdate()
    UpdateAstro()
    UpdateMatrix()
    updateMatrixTexture()
    UpdateLines()
    ProcessMouse()
    CameraState()
    UpdateCSSDescription()
    fpsLogger()
    // TemporaryUI()

    // Update controls
    controls.update()
    UpdateCSS()

    // Render
    if (criticalFPS < 2 && doBloom) effectComposer.render()
    else renderer.render(scene, camera)

    if (count <= 0 && criticalFPS < 1) {
        for (const myPlanet in planetList) {
            planetList[myPlanet].object.visible = false
            planetList[myPlanet].labelObject.visible = false
            for (let i = 0; i < planetList[myPlanet].moonQuantity; i++) {
                planetList[myPlanet].moonObjects[i].visible = false
            }
        }
        blackHoleCenter.visible = false
        blackHoleHalo.visible = false
        //blackHoleRing.visible = true
        cubeCamera1.update(renderer, scene);
        cubeRenderTarget1.needsUpdate = true
        blackHoleTorusMaterialReflex.envMap = cubeRenderTarget1.texture;
        for (const myPlanet in planetList) {
            planetList[myPlanet].object.visible = true
            planetList[myPlanet].labelObject.visible = true
            for (let i = 0; i < planetList[myPlanet].moonQuantity; i++) {
                planetList[myPlanet].moonObjects[i].visible = true
            }
        }
        //blackHoleRing.visible = true
        blackHoleCenter.visible = true
        blackHoleHalo.visible = true
        count++
    } else count = 0

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
```