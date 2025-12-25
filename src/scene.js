import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

export let scene, camera, renderer, controls, outlinePass, composer;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    // 1. Setup Composer
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(window.devicePixelRatio);
    // 2. Base Render Pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 3. Outline Pass
    outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 
        scene, 
        camera
    );
    
    // --- SETTINGS YOU CAN TEST ---
    // Change these to see if they react:
    outlinePass.edgeStrength = 2.0;       // Brightness (1 to 10)
    outlinePass.edgeThickness = 2.0;      // Thickness (Try 1.0 vs 5.0)
    outlinePass.edgeGlow = 1.0;           // No glow for sharp Blender look
    
    // Explicitly using THREE.Color objects to avoid "stuck" colors
    outlinePass.visibleEdgeColor = new THREE.Color(0xffc000); // TEST: Bright Red
    outlinePass.hiddenEdgeColor = new THREE.Color(0x000000);  // Black for hidden parts
    
    composer.addPass(outlinePass);

    // 4. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 5. Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

   // 6. Grid 
    // Parameters: size, divisions, centerLineColor, gridLineColor
    const grid = new THREE.GridHelper(20, 20, 0x999999, 0x777777); 
        grid.name = "SceneGrid";
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);
}

export function startAnimation() {
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        composer.render(); // This is drawing the outline
    }
    animate();
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
}

// ... include getClickedModel here ...
export function getClickedModel(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const objectsToCheck = scene.children.filter(obj => 
        (obj.type === "Group" || obj.isMesh) && obj.name !== "SceneGrid"
    );
    const intersects = raycaster.intersectObjects(objectsToCheck, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && obj.parent !== scene) obj = obj.parent;
        return obj;
    }
    return null;
}