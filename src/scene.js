import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export let scene, sceneUI, camera, renderer, controls, outlinePass, composer;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initScene() {
    // Scene 1: For Models (Gets post-processing)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    // Scene 2: For Grid/Gizmos (No glow, always sharp)
    sceneUI = new THREE.Scene(); 

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // This is required for the overlay effect
    renderer.autoClear = false; 
    
    document.body.appendChild(renderer.domElement);

    // --- Composer for Main Scene ---
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(window.devicePixelRatio);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    outlinePass.edgeStrength = 4.0;
    outlinePass.edgeThickness = 1.0;
    outlinePass.visibleEdgeColor.set(0xffc000);
    outlinePass.hiddenEdgeColor.set(0x000000);
    composer.addPass(outlinePass);

    // The OutputPass makes sure colors are correct
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // --- UI Elements ---
    const grid = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    sceneUI.add(grid);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
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

        // 1. Clear everything
        renderer.clear();

        // 2. Render the main scene via Composer (Models + Outline)
        composer.render();

        // 3. Clear the depth buffer so the Gizmo is always visible on top
        renderer.clearDepth();

        // 4. Render the UI scene (Grid + Gizmo)
        renderer.render(sceneUI, camera);
    }
    animate();
}

export function getClickedModel(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    // Only raycast against models in the main scene
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && obj.parent !== scene) obj = obj.parent;
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