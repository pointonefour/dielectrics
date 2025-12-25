import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as SceneModule from './scene.js'; 
import { getModelState, saveAction, undo, redo } from './history.js'; // Added undo, redo imports
import { setupKeyboard } from './inputHandler.js';
import { setupUI } from './ui.js';

let transformControls, currentModel = null;
let transformStartData = null;

// Helper function to update the highlight
function updateHighlight() {
    if (currentModel) {
        SceneModule.outlinePass.selectedObjects = [currentModel];
    } else {
        SceneModule.outlinePass.selectedObjects = [];
    }
}

function init() {
    SceneModule.initScene();
    
    transformControls = new TransformControls(SceneModule.camera, SceneModule.renderer.domElement);
    const gizmo = transformControls.getHelper ? transformControls.getHelper() : transformControls;
    SceneModule.scene.add(gizmo);

    // Transform Events
    transformControls.addEventListener('dragging-changed', (e) => SceneModule.controls.enabled = !e.value);
    
    transformControls.addEventListener('mouseDown', () => { 
        if (currentModel) transformStartData = getModelState(currentModel); 
    });
    
    transformControls.addEventListener('mouseUp', () => {
        if (currentModel && transformStartData) {
            saveAction(currentModel, transformStartData, getModelState(currentModel));
        }
    });

    // Input selection
    window.addEventListener('mousedown', handleSelection);
    window.addEventListener('contextmenu', handleContextMenu);

    // Keyboard (Passes transformControls for undo/redo shortcuts)
    setupKeyboard(transformControls, () => currentModel, removeModel);

    // UI Orchestration
    setupUI({
        onLoad: (model) => { 
            currentModel = model; 
            transformControls.detach(); 
            updateHighlight(); // Highlight the newly loaded model
        },
        onSetMode: (mode) => { 
            if (currentModel) {
                transformControls.attach(currentModel); 
                transformControls.setMode(mode); 
            }
        },
        onDelete: removeModel,
        onUndo: () => undo(transformControls), // Logic passed here
        onRedo: () => redo(transformControls)  // Logic passed here
    });

    SceneModule.startAnimation();
}

// ... handleSelection, handleContextMenu, removeModel functions stay same as previous post ...

function handleSelection(e) {
    if (e.target.closest('#contextMenu') || e.target.closest('#dropZone') || e.target.closest('.ui-button')) return;
    document.getElementById('contextMenu').style.display = 'none';
    if (e.button !== 0) return;

    const hit = SceneModule.getClickedModel(e);
    if (hit) { 
        currentModel = hit; 
        transformControls.attach(currentModel); 
    }
    else if (!transformControls.dragging) { 
        currentModel = null; 
        transformControls.detach(); 
    }

    updateHighlight(); // Update the yellow border
}

function handleContextMenu(e) {
    const hit = SceneModule.getClickedModel(e);
    if (!hit) return;
    e.preventDefault();
    currentModel = hit;
    transformControls.attach(hit);
    const menu = document.getElementById('contextMenu');
    menu.style.display = 'block';
    menu.style.left = `${e.clientX}px`; 
    menu.style.top = `${e.clientY}px`;
}

function removeModel() {
    if (currentModel) { 
        transformControls.detach(); 
        SceneModule.scene.remove(currentModel); 
        currentModel = null; 
        updateHighlight(); // Clear border
    }
}

init();