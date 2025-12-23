import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

let scene, camera, renderer, controls, transformControls, currentModel;
let contextMenu, dropZone, fileInput;

let undoStack = [];
let redoStack = [];
let transformStartData = null;

const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function init() {
    // --- 1. UI ELEMENTS ---
    contextMenu = document.getElementById('contextMenu');
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('meshUpload');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    // --- 2. SCENE SETUP ---
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

    // --- 3. TRANSFORM CONTROLS (GIZMOS) ---
    transformControls = new TransformControls(camera, renderer.domElement);
    scene.add(transformControls.getHelper ? transformControls.getHelper() : transformControls);

    // Disable camera orbit when dragging gizmo
    transformControls.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
    });

    // --- 4. UNDO/REDO TRACKING ---
    transformControls.addEventListener('mouseDown', () => {
        if (currentModel) transformStartData = getModelState();
    });

    transformControls.addEventListener('mouseUp', () => {
        if (currentModel && transformStartData) {
            const transformEndData = getModelState();
            saveAction(transformStartData, transformEndData);
        }
    });

    // --- 5. LIGHTS & HELPERS ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.GridHelper(10, 10, 0x333333, 0x222222));

    // --- 6. KEYBOARD SHORTCUTS ---
    window.addEventListener('keydown', (event) => {
        if (!currentModel) return;
        const isCtrl = event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;

        // Undo/Redo Shortcuts
        if (isCtrl && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (isShift) redo(); else undo();
            return;
        }

        // Transform Shortcuts
        switch (event.key.toLowerCase()) {
            case 'w': transformControls.attach(currentModel); transformControls.setMode('translate'); break;
            case 'e': transformControls.attach(currentModel); transformControls.setMode('rotate'); break;
            case 'r': transformControls.attach(currentModel); transformControls.setMode('scale'); break;
            case 'delete': removeModel(); break;
            case 'escape': transformControls.detach(); break;
        }
    });

    // --- 7. BUTTON LISTENERS ---
    const bindBtn = (id, action, mode = null) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (currentModel) {
                if (mode) {
                    transformControls.attach(currentModel);
                    transformControls.setMode(mode);
                } else { action(); }
            }
            hideMenu();
        });
    };

    bindBtn('menuDelete', removeModel);
    bindBtn('menuTranslate', null, 'translate');
    bindBtn('menuRotate', null, 'rotate');
    bindBtn('menuScale', null, 'scale');

    if(undoBtn) undoBtn.addEventListener('click', undo);
    if(redoBtn) redoBtn.addEventListener('click', redo);

    // --- 8. UI, CLICK, & DRAG LOGIC ---
    window.addEventListener('contextmenu', onContextMenu);
    
    window.addEventListener('mousedown', (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) hideMenu();

        // Left Click + Raycaster to deselect Gizmo
        if (e.button === 0 && currentModel) {
            if (contextMenu.contains(e.target) || dropZone.contains(e.target)) return;
            
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(currentModel, true);

            if (intersects.length === 0) {
                transformControls.detach();
            }
        }
    });

    // Drag & Drop Visuals
    dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
    });

    // File Input (Clicking the box)
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadFile(e.target.files[0]);
            e.target.value = ''; 
        }
    });

    window.addEventListener('resize', onWindowResize);
    animate();
}

    // Save the current state of the model (Pos, Rot, Scale)
function getModelState() {
    if (!currentModel) return null;
    return {
        position: currentModel.position.clone(),
        rotation: currentModel.rotation.clone(),
        scale: currentModel.scale.clone()
    };
}

// Apply a saved state to the model
function applyState(state) {
    if (!currentModel || !state) return;
    currentModel.position.copy(state.position);
    currentModel.rotation.copy(state.rotation);
    currentModel.scale.copy(state.scale);
    // Update the gizmo position to match the model
    transformControls.updateMatrixWorld(); 
}

function saveAction(oldState, newState) {
    undoStack.push({ oldState, newState });
    redoStack = []; // Clear redo whenever a new action happens
    if (undoStack.length > 50) undoStack.shift(); // Limit memory
}

function undo() {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    redoStack.push(action);
    applyState(action.oldState);
    console.log("Undo performed");
}

function redo() {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    undoStack.push(action);
    applyState(action.newState);
    console.log("Redo performed");
}

// --- Logic Functions ---

function onContextMenu(event) {
    event.preventDefault();
    if (!currentModel) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(currentModel, true);

    if (intersects.length > 0) {
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
    }
}

function loadFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    loader.load(url, (gltf) => {
        if (currentModel) removeModel();
        currentModel = gltf.scene;
        scene.add(currentModel);
        fitCameraToModel(currentModel);
        
        // FIXED: Do NOT attach gizmo here. 
        // It only attaches via the menu or keyboard shortcuts.
        transformControls.detach(); 
        
        URL.revokeObjectURL(url);
    });
}

function removeModel() {
    if (currentModel) {
        transformControls.detach();
        scene.remove(currentModel);
        currentModel = null;
    }
}

function hideMenu() { if (contextMenu) contextMenu.style.display = 'none'; }

function fitCameraToModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center); 
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
    camera.lookAt(0,0,0);
    controls.target.set(0, 0, 0);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.onload = init;