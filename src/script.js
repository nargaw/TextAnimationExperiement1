import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'
import { MSDFTextGeometry, uniforms } from 'three-msdf-text-utils'
import fnt from './Font/MSDF/roboto-regular.json'
import png from './Font/MSDF/roboto-regular.png'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const gltfLoader = new GLTFLoader()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
scene.add(camera)
camera.position.set(0, 0, 27)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
// renderer.toneMapping = THREE.ACESFilmicToneMapping
// renderer.toneMappingExposure = 3
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)
renderer.setClearColor(new THREE.Color(0x1f1f1f))

/**
 * Mouse
 */
let mouseX
let mouseY

/**
 * Material
 */
const materialParameters = {}
materialParameters.color = '#ffffff'

const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms:
    {
         // Common
         ...uniforms.common,
        
         // Rendering
         ...uniforms.rendering,
         
         // Strokes
         ...uniforms.strokes,
         ...{
             uStrokeColor: {value: new THREE.Color(0x0000ff)}
         },
        uTime: new THREE.Uniform(0),
        uMouse: new THREE.Uniform(new THREE.Vector2(mouseX, mouseY))
    },
    side: THREE.DoubleSide,
    transparent: true,
    defines: {
        IS_SMALL: false,
    },
    extensions: {
        derivatives: true,
    },
})

gui
    .addColor(materialParameters, 'color')
    .onChange(() =>
    {
        material.uniforms.uColor.value.set(materialParameters.color)
    })

let boundingBox
const meshSizes = {
    width: 0,
    height: 0,
    leftPixel: 0,
    rightPixel: 0,
    topPixel: 0,
    bottomPixel: 0
}

/**
 * MSDF Font
 */

Promise.all([
    loadFontAtlas(png),
]).then(([atlas]) => {
    const geometry = new MSDFTextGeometry({
        text: "Three.js",
        font: fnt,
    });
    
    material.uniforms.uMap.value = atlas;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh)
    // console.log(mesh)
    mesh.scale.set(0.1, -0.1, 0.1)
    mesh.position.x = -15
    mesh.position.z = -20

    console.log(mesh.geometry)
    const boundingBox = new THREE.Box3().setFromObject(mesh)
    // const size = boundingBox.getSize()
    
    const meshSize = {
        x: 10,
        y: 5
    }
    /**
     * fixMouse
     */
    const topLeft = new THREE.Vector3(
        mesh.position.x - meshSize.x / 2,
        mesh.position.y + meshSize.y /2,
        mesh.position.z
    )
    const bottomLeft = new THREE.Vector3(
        mesh.position.x - meshSize.x  / 2,
        mesh.position.y - meshSize.y /2,
        mesh.position.z
    )
    const topRight = new THREE.Vector3(
        mesh.position.x + meshSize.x  / 2,
        mesh.position.y + meshSize.y /2,
        mesh.position.z
    )
    const bottomRight = new THREE.Vector3(
        mesh.position.x + meshSize.x  / 2,
        mesh.position.y - meshSize.y /2,
        mesh.position.z
    )

    topLeft.project(camera)
    bottomLeft.project(camera)
    topRight.project(camera)
    bottomRight.project(camera)

    const topLeftX = (1 + topLeft.x) / 2 * sizes.width
    const topLeftY = (1 - topLeft.y) / 2 * sizes.height
    const topRightX = (1 + topRight.x) / 2 * sizes.width
    const bottomRightY = (1 - bottomRight.y) / 2 * sizes.height

    const meshLeftPixel = topLeftX
    const meshRightPixel = topRightX
    const meshTopPixel = topLeftY
    const meshBottomPixel = bottomRightY

    const remap = (value, low1, high1, low2, high2 ) => {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1)
    }

    /**
     * SetMouse
     */
    addEventListener('mousemove', (e) => {
        if(e.clientX >= meshLeftPixel && e.clientX <= meshRightPixel){
            mouseX = remap(e.clientX, meshLeftPixel, meshRightPixel, 0, 1)
        }
        if(e.clientY >= meshTopPixel && e.clientY <= meshBottomPixel){
            mouseY = remap(e.clientY, meshTopPixel, meshBottomPixel, 0, 1)
        }
    })
});

function loadFontAtlas(path) {
    const promise = new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(path, resolve);
    });

    return promise;
}





/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    material.uniforms.uTime.value = elapsedTime
    material.uniforms.uMouse.value = new THREE.Vector2(mouseX, mouseY)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()