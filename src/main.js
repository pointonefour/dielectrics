import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as SceneModule from './scene.js'; 
import { getModelState, saveAction, undo, redo } from './history.js';
import { loadModel, fitCameraToModel } from './loader.js';

let transformControls, currentModel;
let transformStartData = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Define DOM elements globally within this module
let contextMenu, dropZone, fileInput;

function init() {
    SceneModule.initScene();
    
    contextMenu = document.getElementById('contextMenu');
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('meshUpload');

    transformControls = new TransformControls(SceneModule.camera, SceneModule.renderer.domElement);
    
    // Ensure gizmo is added to scene correctly
    const gizmo = transformControls.getHelper ? transformControls.getHelper() : transformControls;
    SceneModule.scene.add(gizmo);

    setupEventListeners();
    animate();
}

function setupEventListeners() {
    // 1. RIGHT-CLICK (Context Menu) Logic
    window.addEventListener('contextmenu', (e) => {
        const hit = getClickedModel(e);
        if (hit) {
            e.preventDefault(); // Stop the standard browser menu
            currentModel = hit;
            
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;
            
            // Optional: Automatically show move gizmo when right-clicking
            transformControls.attach(currentModel);
        } else {
            hideMenu();
        }
    });

    // 2. Click-to-Select Logic
    window.addEventListener('mousedown', (e) => {
        // If clicking on the context menu or dropzone, don't deselect
        if (e.target.closest('#contextMenu') || e.target.closest('#dropZone')) return;
        
        hideMenu();

        if (e.button === 0) { // Left Click
            const hit = getClickedModel(e);
            if (hit) {
                currentModel = hit;
                transformControls.attach(currentModel);
            } else if (!transformControls.dragging) {
                transformControls.detach();
                currentModel = null;
            }
        }
    });

    // 3. UI Buttons (Inside Context Menu and Undo/Redo)
    const bindBtn = (id, action, mode = null) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (currentModel) {
                if (mode) {
                    transformControls.attach(currentModel);
                    transformControls.setMode(mode);
                } else if (action) {
                    action();
                }
            }
            hideMenu();
        });
    };

    bindBtn('menuTranslate', null, 'translate');
    bindBtn('menuRotate', null, 'rotate');
    bindBtn('menuScale', null, 'scale');
    bindBtn('menuDelete', removeModel);

    document.getElementById('undoBtn')?.addEventListener('click', () => undo(transformControls));
    document.getElementById('redoBtn')?.addEventListener('click', () => redo(transformControls));

    // 4. File Upload (Click & Drag-Drop)
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        dropZone.addEventListener(name, (e) => e.preventDefault());
    });
    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
    });

    // 5. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            e.shiftKey ? redo(transformControls) : undo(transformControls);
            return;
        }
        if (!currentModel) return;
        switch (e.key.toLowerCase()) {
            case 'w': transformControls.setMode('translate'); break;
            case 'e': transformControls.setMode('rotate'); break;
            case 'r': transformControls.setMode('scale'); break;
            case 'delete': removeModel(); break;
            case 'escape': transformControls.detach(); break;
        }
    });

    // 6. Transform Logic
    transformControls.addEventListener('dragging-changed', (e) => {
        SceneModule.controls.enabled = !e.value;
    });
    transformControls.addEventListener('mouseDown', () => {
        if (currentModel) transformStartData = getModelState(currentModel);
    });
    transformControls.addEventListener('mouseUp', () => {
        if (currentModel && transformStartData) {
            saveAction(currentModel, transformStartData, getModelState(currentModel));
        }
    });
}

function handleFileUpload(file) {
    loadModel(file, SceneModule.scene, (model) => {
        currentModel = model;
        fitCameraToModel(model, SceneModule.camera, SceneModule.controls);
        
        // FIX: Detach controls so the gizmo doesn't appear immediately upon load
        transformControls.detach(); 
        
        console.log("Model loaded. Click it to transform.");
    });
}

function getClickedModel(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, SceneModule.camera);

    const objectsToCheck = SceneModule.scene.children.filter(obj => 
        obj.type === "Group" || (obj.isMesh && obj.name !== "SceneGrid")
    );

    const intersects = raycaster.intersectObjects(objectsToCheck, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && obj.parent !== SceneModule.scene) obj = obj.parent;
        return obj;
    }
    return null;
}

function hideMenu() { 
    if (contextMenu) contextMenu.style.display = 'none'; 
}

function removeModel() {
    if (currentModel) {
        transformControls.detach();
        SceneModule.scene.remove(currentModel);
        currentModel = null;
    }
}

function animate() {
    requestAnimationFrame(animate);
    SceneModule.controls.update();
    SceneModule.renderer.render(SceneModule.scene, SceneModule.camera);
}

init();