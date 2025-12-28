import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export let scene, sceneUI, camera, renderer, controls, outlinePass, composer, grid;
// Create this immediately so loader.js has a valid reference
export const modelGroup = new THREE.Group(); 

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    sceneUI = new THREE.Scene(); 
    
    // Add the group to the scene
    scene.add(modelGroup);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2; 
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false; 
    document.body.appendChild(renderer.domElement);

    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    outlinePass.edgeStrength = 4.0;
    outlinePass.edgeThickness = 1.0;
    outlinePass.visibleEdgeColor.set(0xffc000);
    composer.addPass(outlinePass);
    composer.addPass(new OutputPass());

    grid = new THREE.GridHelper(100, 100, 0x555555, 0x333333);
    scene.add(grid);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    window.addEventListener('resize', onWindowResize);
}

export function startAnimation() {
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.clear();
        composer.render();
        renderer.clearDepth();
        renderer.render(sceneUI, camera);
    }
    animate();
}

export function getClickedModel(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    // Check objects ONLY inside modelGroup
    const intersects = raycaster.intersectObjects(modelGroup.children, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        // Bubble up to the direct child of modelGroup
        while (obj.parent && obj.parent !== modelGroup) {
            obj = obj.parent;
        }
        return obj;
    }
    return null;
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
}