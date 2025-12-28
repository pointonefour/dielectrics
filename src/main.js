import * as THREE from 'three'; 
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as SceneModule from './scene.js'; 
import { getModelState, saveAction, undo, redo } from './history.js'; 
import { setupKeyboard } from './inputHandler.js';
import { setupUI, syncMaterialSliders } from './ui.js';
import { convertToDielectric } from './engine.js'; 

let transformControls, currentModel = null;
let transformStartData = null;

function updateHighlight() {
    SceneModule.outlinePass.selectedObjects = currentModel ? [currentModel] : [];
}

/**
 * Main Initialization
 */
function init() {
    SceneModule.initScene();
    
    // Setup Transform Controls
    transformControls = new TransformControls(SceneModule.camera, SceneModule.renderer.domElement);
    const gizmo = transformControls.getHelper ? transformControls.getHelper() : transformControls;
    SceneModule.sceneUI.add(gizmo);

    // --- 1. HISTORY LISTENERS FOR TRANSFORM CONTROLS ---
    // Capture state BEFORE movement starts
    transformControls.addEventListener('mouseDown', () => { 
        if (currentModel) transformStartData = getModelState(currentModel); 
    });
    
    // Capture state AFTER movement ends and save to history
    transformControls.addEventListener('mouseUp', () => {
        if (currentModel && transformStartData) {
            const newState = getModelState(currentModel);
            saveAction(currentModel, transformStartData, newState);
        }
    });

    // OrbitControls / TransformControls synchronization
    transformControls.addEventListener('dragging-changed', (e) => {
        SceneModule.controls.enabled = !e.value;
    });
    
    // Global Listeners
    window.addEventListener('mousedown', handleSelection);
    window.addEventListener('contextmenu', handleContextMenu); 

    setupKeyboard(transformControls, () => currentModel, removeModel);

    setupUI({
        onLoad: (model) => { 
            currentModel = model; 
            transformControls.detach(); 
            updateHighlight();
            syncMaterialSliders(model);
        },
        onSetMode: (mode) => { 
            if (currentModel) {
                transformControls.attach(currentModel); 
                transformControls.setMode(mode); 
            }
        },
        onDelete: removeModel,
        
        // --- 2. UPDATED HISTORY CALLBACKS ---
        onUndo: () => undo(transformControls), // Pass controls so gizmo moves back too
        onRedo: () => redo(transformControls),

        onToggleGrid: () => {
            SceneModule.grid.visible = !SceneModule.grid.visible;
            return SceneModule.grid.visible;
        },
        onToggleSnap: (enabled) => {
            if (enabled) {
                transformControls.setTranslationSnap(1); 
                transformControls.setRotationSnap(THREE.MathUtils.degToRad(15)); 
            } else {
                transformControls.setTranslationSnap(null);
                transformControls.setRotationSnap(null);
            }
        },
        onConvertDielectric: () => {
            if (currentModel) {
                convertToDielectric(currentModel); 
                return true; 
            }
            return false;
        },
        getCurrentModel: () => currentModel
    });

    SceneModule.startAnimation();
}

/**
 * Handles Left-Click Selection
 */
function handleSelection(e) {
    if (e.target.closest('#contextMenu') || e.target.closest('.sleek-menu') || e.target.closest('.history-controls') || e.target.closest('#dropZone') || e.target.closest('button')) {
        return; 
    }

    if (e.button !== 0) return;

    document.getElementById('contextMenu').style.display = 'none';
    document.querySelectorAll('.sleek-menu').forEach(menu => menu.classList.remove('active'));

    if (transformControls.axis !== null) return;

    const hit = SceneModule.getClickedModel(e);

    if (hit) { 
        currentModel = hit; 
        transformControls.attach(currentModel); 
        syncMaterialSliders(currentModel);
    } else {
        if (!transformControls.dragging) { 
            currentModel = null; 
            transformControls.detach(); 
            syncMaterialSliders(null);
        }
    }

    updateHighlight();
}

/**
 * Handles Right-Click Context Menu
 */
function handleContextMenu(e) {
    e.preventDefault(); 

    const hit = SceneModule.getClickedModel(e);
    
    if (hit) {
        currentModel = hit;
        transformControls.attach(currentModel);
        updateHighlight();
        syncMaterialSliders(currentModel);

        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = `${e.clientX}px`; 
        menu.style.top = `${e.clientY}px`;
    } else {
        document.getElementById('contextMenu').style.display = 'none';
    }
}

function removeModel() {
    if (currentModel) { 
        transformControls.detach(); 
        SceneModule.modelGroup.remove(currentModel); 
        currentModel = null; 
        updateHighlight();
        syncMaterialSliders(null);
    }
}

init();