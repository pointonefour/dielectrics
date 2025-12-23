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
    contextMenu = document.getElementById('contextMenu');
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('meshUpload');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

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

    transformControls = new TransformControls(camera, renderer.domElement);
    scene.add(transformControls.getHelper ? transformControls.getHelper() : transformControls);

    transformControls.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
    });

    transformControls.addEventListener('mouseDown', () => {
        if (currentModel) transformStartData = getModelState(currentModel);
    });

    transformControls.addEventListener('mouseUp', () => {
        if (currentModel && transformStartData) {
            const transformEndData = getModelState(currentModel);
            saveAction(currentModel, transformStartData, transformEndData);
        }
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(10, 10, 0x333333, 0x222222);
    grid.name = "SceneGrid"; // Named so we can ignore it
    scene.add(grid);

    window.addEventListener('keydown', (event) => {
        if (!currentModel) return;
        const isCtrl = event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;

        if (isCtrl && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (isShift) redo(); else undo();
            return;
        }

        switch (event.key.toLowerCase()) {
            case 'w': transformControls.attach(currentModel); transformControls.setMode('translate'); break;
            case 'e': transformControls.attach(currentModel); transformControls.setMode('rotate'); break;
            case 'r': transformControls.attach(currentModel); transformControls.setMode('scale'); break;
            case 'delete': removeModel(); break;
            case 'escape': transformControls.detach(); break;
        }
    });

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

    window.addEventListener('contextmenu', onContextMenu);
    
    window.addEventListener('mousedown', (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) hideMenu();

        if (e.button === 0) {
            if (contextMenu.contains(e.target) || dropZone.contains(e.target)) return;
            
            const hit = getClickedModel(e);
            if (hit) {
                currentModel = hit;
                if (transformControls.object) transformControls.attach(currentModel);
            } else {
                transformControls.detach();
                currentModel = null; 
            }
        }
    });

    dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
    });

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

// --- HELPER: Identify only Models ---
function getClickedModel(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Filter scene children to exclude Grid, Lights, and TransformControls
    const objectsToCheck = scene.children.filter(obj => 
        obj.type === "Group" || (obj.isMesh && obj.name !== "SceneGrid")
    );

    const intersects = raycaster.intersectObjects(objectsToCheck, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && obj.parent !== scene) {
            obj = obj.parent;
        }
        return obj;
    }
    return null;
}

// --- HISTORY LOGIC ---
function getModelState(model) {
    return {
        position: model.position.clone(),
        rotation: model.rotation.clone(),
        scale: model.scale.clone()
    };
}

function applyState(model, state) {
    if (!model || !state) return;
    model.position.copy(state.position);
    model.rotation.copy(state.rotation);
    model.scale.copy(state.scale);
    transformControls.updateMatrixWorld();
}

function saveAction(model, oldState, newState) {
    undoStack.push({ model, oldState, newState });
    redoStack = [];
    if (undoStack.length > 100) undoStack.shift();
}

function undo() {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    redoStack.push(action);
    applyState(action.model, action.oldState);
}

function redo() {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    undoStack.push(action);
    applyState(action.model, action.newState);
}

// --- LOGIC FUNCTIONS ---
function onContextMenu(event) {
    event.preventDefault();
    const hit = getClickedModel(event);
    if (hit) {
        currentModel = hit;
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
    } else {
        hideMenu();
    }
}

function loadFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    loader.load(url, (gltf) => {
        const newModel = gltf.scene;
        scene.add(newModel);
        currentModel = newModel;
        
        fitCameraToModel(newModel);
        transformControls.detach(); 
        URL.revokeObjectURL(url);
        console.log("Model loaded");
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