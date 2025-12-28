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

function init() {
    SceneModule.initScene();
    
    transformControls = new TransformControls(SceneModule.camera, SceneModule.renderer.domElement);
    const gizmo = transformControls.getHelper ? transformControls.getHelper() : transformControls;
    SceneModule.sceneUI.add(gizmo);

    transformControls.addEventListener('dragging-changed', (e) => {
        SceneModule.controls.enabled = !e.value;
    });
    
    // Global Listeners
    window.addEventListener('mousedown', handleSelection);
    window.addEventListener('contextmenu', handleContextMenu); // This handles the Menu popup

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
        onUndo: () => undo(transformControls),
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
 * FIXED: handleSelection only handles LEFT-CLICK
 */
function handleSelection(e) {
    // 1. Guard: If clicking UI or the Context Menu itself, do nothing
    if (e.target.closest('#contextMenu') || e.target.closest('.sleek-menu') || e.target.closest('.history-controls') || e.target.closest('button')) {
        return; 
    }

    // 2. IMPORTANT: Only run this logic on LEFT CLICK (button 0)
    // If it's a right click (button 2), we exit immediately so the menu can show
    if (e.button !== 0) return;

    // 3. Hide the context menu and panels on a new left click
    document.getElementById('contextMenu').style.display = 'none';
    document.querySelectorAll('.sleek-menu').forEach(menu => menu.classList.remove('active'));

    // 4. Transform Control check
    if (transformControls.axis !== null) return;

    // 5. Raycast to find model
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
 * FIXED: handleContextMenu explicitly shows the menu
 */
function handleContextMenu(e) {
    e.preventDefault(); // Stop browser menu

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
        
        console.log("Context Menu triggered on model");
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