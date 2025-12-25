import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export let scene, camera, renderer, controls;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // Grid
    const grid = new THREE.GridHelper(10, 10, 0x333333, 0x222222);
    grid.name = "SceneGrid";
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);
}

// Moves the rendering logic out of main.js
export function startAnimation(onUpdate) {
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        if (onUpdate) onUpdate(); // Call any extra logic (like transformControls update)
        renderer.render(scene, camera);
    }
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getClickedModel(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Filter out Grid, Lights, and the Transform Gizmo itself
    const objectsToCheck = scene.children.filter(obj => 
        (obj.type === "Group" || obj.isMesh) && 
        obj.name !== "SceneGrid" && 
        !obj.isTransformControls // Built-in check for some versions
    );

    const intersects = raycaster.intersectObjects(objectsToCheck, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        // Traverse up to find the root Group (the model)
        while (obj.parent && obj.parent !== scene) {
            // Stop if we hit a gizmo part
            if (obj.name.includes("gizmo")) return null; 
            obj = obj.parent;
        }
        return obj;
    }
    return null;
}